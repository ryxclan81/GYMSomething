import type { Exercise } from "./types";

/** Spelling discovery is separate from the immutable bundled catalog hash. */
const familiarNames: Record<string, string[]> = {
  "ex-pushups": [
    "push up",
    "push ups",
    "pushup",
    "pushups",
    "press ups",
    "standard push-up",
  ],
  "ex-3-4-sit-up": [
    "sit up",
    "sit ups",
    "situp",
    "situps",
    "three quarter sit-up",
  ],
  "ex-pullups": ["pull up", "pull ups", "pullup", "pullups"],
  "ex-chin-up": ["chin up", "chin ups", "chinup", "chinups"],
  "ex-bodyweight-squat": [
    "air squat",
    "air squats",
    "body weight squat",
    "bodyweight squats",
  ],
  "ex-crunches": ["crunch", "ab crunch", "abdominal crunch"],
  "ex-single-leg-glute-bridge": ["single-leg bridge", "one leg hip bridge"],
};

export function normalizeExerciseSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\b(?:push|press)\s*ups?\b/g, "pushup")
    .replace(/\bsit\s*ups?\b/g, "situp")
    .replace(/\bpull\s*ups?\b/g, "pullup")
    .replace(/\bchin\s*ups?\b/g, "chinup")
    .replace(/\bbody\s+weight\b/g, "bodyweight")
    .replace(/\bdumb\s+bells?\b/g, "dumbbell")
    .replace(/\bdead\s+lifts?\b/g, "deadlift")
    .replace(/\brdl\b/g, "romanian deadlift")
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/\bbw\b/g, "bodyweight")
    .replace(/\b(dumbbell|barbell|squat|curl|lunge|crunch|deadlift)s\b/g, "$1")
    .replace(/\s+/g, " ");
}

function editDistance(left: string, right: string): number {
  // Optimal string alignment includes adjacent transpositions: psuh -> push.
  const table = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );
  for (let i = 0; i <= left.length; i++) table[i][0] = i;
  for (let j = 0; j <= right.length; j++) table[0][j] = j;
  for (let i = 1; i <= left.length; i++)
    for (let j = 1; j <= right.length; j++) {
      table[i][j] = Math.min(
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
        table[i - 1][j - 1] + Number(left[i - 1] !== right[j - 1]),
      );
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      )
        table[i][j] = Math.min(table[i][j], table[i - 2][j - 2] + 1);
    }
  return table[left.length][right.length];
}

interface IndexedExercise {
  name: string;
  names: { value: string; weight: number; familiar?: boolean }[];
  tokens: { value: string; weight: number }[];
}
const indexes = new WeakMap<Exercise, IndexedExercise>();
function indexExercise(exercise: Exercise): IndexedExercise {
  const cached = indexes.get(exercise);
  // Library data is immutable between updates. Custom editors create new objects.
  if (cached) return cached;
  const name = normalizeExerciseSearch(exercise.name);
  const names = [
    { value: name, weight: 100 },
    ...exercise.aliases.map((value) => ({
      value: normalizeExerciseSearch(value),
      weight: 90,
    })),
    ...(familiarNames[exercise.id] ?? []).map((value) => ({
      value: normalizeExerciseSearch(value),
      weight: 90,
      familiar: true,
    })),
    ...[
      ...exercise.primary,
      ...exercise.secondary,
      ...exercise.equipment,
      exercise.pattern,
      exercise.category,
      ...(exercise.tags ?? []),
    ].map((value) => ({ value: normalizeExerciseSearch(value), weight: 45 })),
  ];
  const indexed = {
    name,
    names,
    tokens: names.flatMap(({ value, weight }) =>
      value
        .split(" ")
        .filter(Boolean)
        .map((word) => ({ value: word, weight })),
    ),
  };
  indexes.set(exercise, indexed);
  return indexed;
}

function tokenScore(query: string, candidate: string): number {
  if (candidate === query) return 10;
  if (candidate.startsWith(query)) return 8;
  if (query.length < 4) return 0;
  const threshold = query.length >= 6 ? 2 : 1;
  const strings = [candidate];
  if (candidate.length > query.length)
    strings.push(candidate.slice(0, query.length));
  let best = 0;
  for (const value of strings) {
    if (Math.abs(query.length - value.length) > threshold) continue;
    const distance = editDistance(query, value);
    if (distance <= threshold) best = Math.max(best, 6 - distance * 2);
  }
  return best;
}

export function exerciseSearchScore(exercise: Exercise, query: string): number {
  const normalized = normalizeExerciseSearch(query);
  if (!normalized) return 1;
  const index = indexExercise(exercise);
  const compact = normalized.replace(/ /g, "");
  let phrase = 0;
  for (const field of index.names) {
    const candidate = field.value.replace(/ /g, "");
    if (candidate === compact) phrase = Math.max(phrase, field.weight * 20);
    else if (candidate.startsWith(compact))
      phrase = Math.max(phrase, field.weight * 12);
    else if (candidate.includes(compact))
      phrase = Math.max(phrase, field.weight * 9);
    else if (
      compact.length >= 6 &&
      Math.abs(candidate.length - compact.length) <= 2
    ) {
      const distance = editDistance(compact, candidate);
      if (distance <= 2)
        phrase = Math.max(
          phrase,
          field.weight * (16 - distance * 2) + (field.familiar ? 150 : 0),
        );
    }
  }
  const scores = normalized
    .split(" ")
    .map((word) =>
      Math.max(
        0,
        ...index.tokens.map(
          (candidate) => tokenScore(word, candidate.value) * candidate.weight,
        ),
      ),
    );
  if (!phrase && scores.some((score) => score === 0)) return 0;
  return (
    Math.max(
      phrase,
      scores.reduce((sum, score) => sum + score, 0),
    ) +
    // The uncomplicated name wins among otherwise equally matched variations.
    Math.max(0, 20 - index.name.length / 4)
  );
}

/** Ranked search; filters belong to the caller so explicit library filters stay in effect. */
export function searchExercises(
  exercises: Exercise[],
  query: string,
  limit?: number,
): Exercise[] {
  const normalized = normalizeExerciseSearch(query);
  const results = exercises
    .map((exercise) => ({
      exercise,
      score: exerciseSearchScore(exercise, normalized),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        (normalized ? b.score - a.score : 0) ||
        Number(Boolean(b.exercise.favorite)) -
          Number(Boolean(a.exercise.favorite)) ||
        a.exercise.name.localeCompare(b.exercise.name),
    )
    .map(({ exercise }) => exercise);
  return limit === undefined
    ? results
    : results.slice(0, Math.max(0, Math.floor(limit)));
}
