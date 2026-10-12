import type {
  AppData,
  EquipmentProfile,
  Exercise,
  Goal,
  Prescription,
  ProgressionRule,
  Session,
  Suggestion,
  Unit,
  WorkoutSet,
} from "./types";
import {
  addDays,
  dateKey,
  id,
  prescription as defaultPrescription,
  weekStart,
} from "./helpers";

const KG_PER_LB = 0.45359237;
const DAY_MS = 86400000;
const finite = (n: number) => Number.isFinite(n);
const nonnegative = (n: number) => (finite(n) ? Math.max(0, n) : 0);
const round = (n: number) => Math.round(n * 1000) / 1000;
export const toKg = (value: number, unit: Unit): number =>
  unit === "lb" ? value * KG_PER_LB : value;
export const fromKg = (value: number, unit: Unit): number =>
  unit === "lb" ? value / KG_PER_LB : value;

/** A warm-up, skipped, unfinished or empty set never contributes to working totals. */
export function workingSet(set: WorkoutSet): boolean {
  return (
    set.completed &&
    !set.skipped &&
    set.type !== "warmup" &&
    (nonnegative(set.reps) > 0 ||
      nonnegative(set.durationSeconds) > 0 ||
      nonnegative(set.distanceKm) > 0)
  );
}

/** Epley estimate in the exercise's recorded load convention. Not a tested maximum. */
export function estimated1RM(
  set: WorkoutSet,
  exercise: Exercise,
): number | null {
  if (
    !workingSet(set) ||
    exercise.measurement !== "weight-reps" ||
    !["total", "per-hand", "machine"].includes(exercise.load) ||
    !finite(set.weightKg) ||
    set.weightKg <= 0 ||
    !Number.isInteger(set.reps) ||
    set.reps < 1 ||
    set.reps > 10
  )
    return null;
  return set.reps === 1 ? set.weightKg : set.weightKg * (1 + set.reps / 30);
}

/** External load only. Body mass and assistance do not become fictional tonnage. */
export function volumeLoad(set: WorkoutSet, exercise: Exercise): number {
  if (
    !workingSet(set) ||
    ["cardio", "duration", "assisted"].includes(exercise.measurement) ||
    ["none", "assistance"].includes(exercise.load)
  )
    return 0;
  const implementCount =
    exercise.load === "per-hand" && exercise.tags?.includes("two-implements")
      ? 2
      : 1;
  return nonnegative(set.weightKg) * nonnegative(set.reps) * implementCount;
}

export function sessionStats(session: Session): {
  sets: number;
  reps: number;
  volume: number;
  durationSeconds: number;
} {
  let sets = 0,
    reps = 0,
    volume = 0;
  for (const entry of session.exercises)
    for (const set of entry.sets) {
      if (!workingSet(set)) continue;
      sets++;
      reps += nonnegative(set.reps);
      volume += volumeLoad(set, entry.exercise);
    }
  const end = session.completedAt
    ? new Date(session.completedAt).getTime()
    : Date.now();
  return {
    sets,
    reps,
    volume,
    durationSeconds: nonnegative(
      Math.floor((end - new Date(session.startedAt).getTime()) / 1000),
    ),
  };
}

function completedSessions(sessions: Session[]): Session[] {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (
      seen.has(session.id) ||
      !session.completedAt ||
      !finite(Date.parse(session.completedAt)) ||
      sessionStats(session).sets === 0
    )
      return false;
    seen.add(session.id);
    return true;
  });
}

export function muscleVolume(
  sessions: Session[],
  exercises: Exercise[],
  fromDate: string,
  indirectFactor = 0.5,
): { muscle: string; direct: number; indirect: number; frequency: number }[] {
  const rows = new Map<
    string,
    { direct: number; indirect: number; days: Set<string> }
  >();
  const factor = Math.min(1, nonnegative(indirectFactor));
  const get = (muscle: string) => {
    if (!rows.has(muscle))
      rows.set(muscle, { direct: 0, indirect: 0, days: new Set() });
    return rows.get(muscle)!;
  };
  for (const session of completedSessions(sessions)) {
    const day = dateKey(new Date(session.completedAt!));
    if (day < fromDate) continue;
    for (const entry of session.exercises) {
      // Prefer the immutable session snapshot; catalog edits cannot rewrite historical attribution.
      const exercise =
        entry.exercise ?? exercises.find((e) => e.id === entry.exerciseId);
      if (
        !exercise ||
        exercise.measurement === "cardio" ||
        /mobility|stretch/i.test(exercise.category)
      )
        continue;
      const sets = entry.sets.filter(workingSet).length;
      if (!sets) continue;
      const primary = new Set(exercise.primary);
      for (const muscle of primary) {
        const row = get(muscle);
        row.direct += sets;
        row.days.add(day);
      }
      for (const muscle of new Set(exercise.secondary)) {
        if (primary.has(muscle) || factor === 0) continue;
        const row = get(muscle);
        row.indirect += sets * factor;
        row.days.add(day);
      }
    }
  }
  return [...rows]
    .map(([muscle, row]) => ({
      muscle,
      direct: row.direct,
      indirect: round(row.indirect),
      frequency: row.days.size,
    }))
    .sort(
      (a, b) =>
        b.direct + b.indirect - a.direct - a.indirect ||
        a.muscle.localeCompare(b.muscle),
    );
}

const normalizedEquipment = (item: string) => item.toLowerCase().trim();
export function equipmentCompatibility(
  exercise: Exercise,
  profile: EquipmentProfile,
  prescribedWeightKg?: number,
): { compatible: boolean; reasons: string[] } {
  const available = new Set(profile.items.map(normalizedEquipment));
  const has = (...items: string[]) =>
    items.some((item) => available.has(normalizedEquipment(item)));
  const reasons: string[] = [];
  for (const required of exercise.equipment) {
    const item = normalizedEquipment(required);
    let supplied = has(required);
    if (["none", "no equipment", "body only"].includes(item)) supplied = true;
    if (item === "dumbbells")
      supplied = has("Dumbbells", "Adjustable dumbbells", "Fixed dumbbells");
    if (item === "flat bench") supplied = has("Flat bench", "Adjustable bench");
    if (item === "adjustable bench")
      supplied = has("Adjustable bench") && profile.canIncline;
    if (item === "cable machine")
      supplied = has("Cable machine", "Functional trainer");
    if (item === "exercise mat") supplied = true; // Optional comfort, never essential resistance equipment.
    if (!supplied)
      reasons.push(
        item === "adjustable bench" &&
          has("Adjustable bench") &&
          !profile.canIncline
          ? "An incline-capable bench is required."
          : `Requires ${required}.`,
      );
  }
  if (
    exercise.load === "per-hand" &&
    profile.maxDumbbellKg !== undefined &&
    profile.maxDumbbellKg <= 0
  )
    reasons.push("No usable dumbbell resistance is available.");
  else if (
    exercise.load === "per-hand" &&
    finite(prescribedWeightKg ?? NaN) &&
    profile.maxDumbbellKg !== undefined &&
    prescribedWeightKg! > profile.maxDumbbellKg
  )
    reasons.push(
      `Target ${round(prescribedWeightKg!)} kg per hand exceeds the ${round(profile.maxDumbbellKg)} kg dumbbell limit.`,
    );
  return { compatible: reasons.length === 0, reasons };
}

export function substitutions(
  exercise: Exercise,
  exercises: Exercise[],
  profile: EquipmentProfile,
  avoidIds: string[] = [],
): Exercise[] {
  const difficulty = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const mobility = (item: Exercise) =>
    /stretch|mobility/i.test(item.category) ||
    item.tags?.includes("stretching");
  const candidates = exercises.filter(
    (other) =>
      !other.archived &&
      other.id !== exercise.id &&
      !avoidIds.includes(other.id) &&
      equipmentCompatibility(other, profile).compatible &&
      difficulty[other.difficulty] <= difficulty[exercise.difficulty] &&
      (exercise.measurement === "cardio"
        ? other.measurement === "cardio"
        : other.measurement !== "cardio") &&
      Boolean(mobility(other)) === Boolean(mobility(exercise)),
  );
  const matches = candidates.filter((other) => {
    const match = substitutionDetails(exercise, other);
    // Broader choices remain honest alternatives, not fictional equipment-free
    // versions of an unavailable pull-up or machine lift.
    return (
      match.kind !== "general" ||
      (other.load === "none" &&
        other.measurement !== "assisted" &&
        sameBodyRegion(exercise, other))
    );
  });
  const score = (other: Exercise) => {
    const primary = overlap(exercise.primary, other.primary);
    const cross =
      overlap(exercise.primary, other.secondary) +
      overlap(exercise.secondary, other.primary);
    const secondary = overlap(exercise.secondary, other.secondary);
    const match = substitutionDetails(exercise, other);
    const simple = [
      "ex-pushups",
      "ex-bodyweight-squat",
      "ex-plank",
      "ex-single-leg-glute-bridge",
      "ex-crunches",
      "ex-bodyweight-walking-lunge",
    ];
    return (
      (match.kind === "movement" ? 80 : match.kind === "muscle" ? 40 : 0) +
      primary * 12 +
      cross * 5 +
      secondary * 2 +
      (other.measurement === exercise.measurement ? 7 : 0) +
      (exercise.alternatives.includes(other.id) ||
      other.alternatives.includes(exercise.id)
        ? 5
        : 0) +
      (simple.includes(other.id) ? 5 : 0) +
      (other.equipment.length === 0 ? 2 : 0) -
      Math.abs(difficulty[other.difficulty] - difficulty[exercise.difficulty])
    );
  };
  return matches
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, 12);
}

const muscleName = (value: string) => {
  const name = value.toLowerCase().trim();
  return (
    (
      {
        quadriceps: "quads",
        abdominals: "core",
        abs: "core",
        "upper-back": "upper back",
      } as Record<string, string>
    )[name] ?? name
  );
};
const overlap = (left: string[], right: string[]) => {
  const names = new Set(right.map(muscleName));
  return new Set(left.map(muscleName).filter((name) => names.has(name))).size;
};
function sameBodyRegion(left: Exercise, right: Exercise) {
  const region = (exercise: Exercise) => {
    const groups = new Set<string>();
    for (const muscle of [...exercise.primary, ...exercise.secondary].map(
      muscleName,
    )) {
      if (
        [
          "chest",
          "shoulders",
          "triceps",
          "biceps",
          "forearms",
          "lats",
          "upper back",
          "traps",
        ].includes(muscle)
      )
        groups.add("upper");
      if (
        [
          "quads",
          "hamstrings",
          "glutes",
          "calves",
          "adductors",
          "abductors",
        ].includes(muscle)
      )
        groups.add("lower");
      if (["core", "lower back"].includes(muscle)) groups.add("trunk");
    }
    return groups;
  };
  const a = region(left),
    b = region(right);
  return [...a].some((name) => b.has(name));
}

export function substitutionDetails(
  original: Exercise,
  candidate: Exercise,
): {
  kind: "movement" | "muscle" | "general";
  reason: string;
} {
  const samePattern =
    original.pattern.trim() &&
    original.pattern === candidate.pattern &&
    !["Accessory", "Hold / mobility"].includes(original.pattern);
  const shared = overlap(
    [...original.primary, ...original.secondary],
    [...candidate.primary, ...candidate.secondary],
  );
  const outdoor = /trail running|outdoor/i.test(candidate.name)
    ? " Needs an appropriate outdoor route."
    : "";
  if (samePattern)
    return {
      kind: "movement",
      reason: `Same movement pattern; resistance and difficulty can differ. Review the new targets.${outdoor}`,
    };
  if (shared)
    return {
      kind: "muscle",
      reason: `Some muscle targets overlap; the movement and emphasis can differ.${outdoor}`,
    };
  return {
    kind: "general",
    reason: `Broader available option for the same body region. It changes the movement and muscle emphasis; it is not an equivalent replacement.${outdoor}`,
  };
}

export type SessionAdaptation =
  { kind: "substitute"; exerciseId: string } | { kind: "skip" };

/** Decisions are keyed by the original template Prescription.id. No input mutates. */
export function adaptWorkoutSession(
  session: Session,
  choices: Record<string, SessionAdaptation>,
  exercises: Exercise[],
  profile: EquipmentProfile,
  avoidIds: string[] = [],
): Session {
  if (session.completedAt)
    throw new Error(
      "Adapt an unfinished workout; keep completed records in history.",
    );
  const ids = new Set(session.exercises.map((entry) => entry.prescription.id));
  if (Object.keys(choices).some((key) => !ids.has(key)))
    throw new Error(
      "An adaptation refers to an exercise outside this session.",
    );
  const result = structuredClone(session);
  result.equipmentId = profile.id;
  for (const entry of result.exercises) {
    const decision = Object.hasOwn(choices, entry.prescription.id)
      ? choices[entry.prescription.id]
      : undefined;
    if (!decision) {
      if (
        !equipmentCompatibility(
          entry.exercise,
          profile,
          entry.prescription.weightKg,
        ).compatible
      )
        throw new Error(`Choose a substitute or skip ${entry.exercise.name}.`);
      continue;
    }
    if (decision.kind === "skip") {
      // Finished sets are actual history, even if remaining work is skipped.
      for (const set of entry.sets) if (!set.completed) set.skipped = true;
      continue;
    }
    if (decision.kind !== "substitute")
      throw new Error("Choose a valid session adaptation.");
    if (entry.sets.some((set) => set.completed && !set.skipped))
      throw new Error(
        "Completed sets must stay with their original exercise. Add the substitute separately.",
      );
    const replacement = exercises.find(
      (exercise) => exercise.id === decision.exerciseId,
    );
    if (
      !replacement ||
      replacement.archived ||
      avoidIds.includes(replacement.id)
    )
      throw new Error(
        "Choose an available exercise that you have not archived or chosen to avoid.",
      );
    if (
      replacement.id === entry.exerciseId ||
      !equipmentCompatibility(replacement, profile, 0).compatible
    )
      throw new Error(
        "Choose a different exercise supported by this equipment environment.",
      );
    const defaults = defaultPrescription(replacement);
    const wasTimed = ["cardio", "duration"].includes(
      entry.exercise.measurement,
    );
    const timed = ["cardio", "duration"].includes(replacement.measurement);
    const old = entry.prescription;
    const prescription: Prescription = {
      ...old,
      exerciseId: replacement.id,
      weightKg: 0,
      repMin: timed ? 0 : wasTimed ? defaults.repMin : old.repMin,
      repMax: timed ? 0 : wasTimed ? defaults.repMax : old.repMax,
      durationSeconds: timed
        ? wasTimed && old.durationSeconds > 0
          ? old.durationSeconds
          : defaults.durationSeconds
        : 0,
      distanceKm:
        replacement.measurement === "cardio" &&
        entry.exercise.measurement === "cardio"
          ? old.distanceKm
          : 0,
      rir: undefined,
      rpe: undefined,
      rule: replacement.progression
        ? structuredClone(replacement.progression)
        : undefined,
    };
    entry.originalExerciseId ??= entry.exerciseId;
    entry.exerciseId = replacement.id;
    entry.exercise = structuredClone(replacement);
    entry.prescription = prescription;
    entry.sets = entry.sets.map((set) => ({
      ...set,
      weightKg: 0,
      reps: prescription.repMin,
      durationSeconds: prescription.durationSeconds,
      distanceKm: prescription.distanceKm,
      rir: undefined,
      rpe: undefined,
      completed: false,
      completedAt: undefined,
      type: set.type === "warmup" ? "warmup" : timed ? "timed" : "working",
    }));
  }
  return result;
}

export function evaluateProgression(
  exercise: Exercise,
  prescription: Prescription,
  sessions: Session[],
  rule: ProgressionRule,
  now = new Date(),
): Suggestion | null {
  if (rule.strategy === "manual" || !finite(now.getTime())) return null;
  const requiredSessions = Math.max(1, Math.ceil(rule.sessions));
  const requiredSets = Math.max(1, Math.ceil(rule.successfulSets));
  if (
    ![
      rule.sessions,
      rule.successfulSets,
      rule.repMin,
      rule.repMax,
      rule.minDays,
    ].every(finite) ||
    requiredSets > prescription.sets ||
    rule.repMin < 0 ||
    rule.repMax < rule.repMin
  )
    return null;
  const history = completedSessions(sessions)
    .filter(
      (session) =>
        Date.parse(session.completedAt!) <= now.getTime() &&
        session.exercises.some(
          (entry) =>
            entry.exerciseId === exercise.id &&
            entry.exercise.load === exercise.load &&
            entry.exercise.measurement === exercise.measurement,
        ),
    )
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  if (!history.length) return null;
  const latest = history[0];
  const sameEnvironment = history.filter(
    (session) => session.equipmentId === latest.equipmentId,
  );
  // A different environment within a success window interrupts comparable history.
  const window = history.slice(0, requiredSessions);
  const setsFor = (session: Session) =>
    session.exercises
      .filter(
        (entry) =>
          entry.exerciseId === exercise.id &&
          entry.exercise.load === exercise.load &&
          entry.exercise.measurement === exercise.measurement,
      )
      .flatMap((entry) => entry.sets)
      .filter(workingSet);
  let baselineNote = "";
  const create = (
    field: Suggestion["field"],
    current: number,
    proposed: number,
    reason: string,
    confidence: Suggestion["confidence"] = "moderate",
  ): Suggestion => ({
    id: id(),
    exerciseId: exercise.id,
    templateId: latest.templateId,
    createdAt: now.toISOString(),
    status: "pending",
    strategy: rule.strategy,
    current,
    proposed: round(proposed),
    field,
    reason: baselineNote + reason,
    confidence,
  });
  const review = (reason: string) =>
    create(
      "review",
      prescription.weightKg,
      prescription.weightKg,
      reason,
      "low",
    );
  const latestSets = setsFor(latest);
  if (!latestSets.length) return null;
  // Zero is the starter's unset external load. Learn a consistent baseline from actual data,
  // without rewriting the original prescription or treating a variation as the same exercise.
  if (
    prescription.weightKg === 0 &&
    !["none"].includes(exercise.load) &&
    !["duration", "cardio"].includes(exercise.measurement)
  ) {
    const loads = new Map<number, number>();
    for (const set of latestSets)
      if (finite(set.weightKg) && set.weightKg > 0)
        loads.set(
          round(set.weightKg),
          (loads.get(round(set.weightKg)) ?? 0) + 1,
        );
    const candidates = [...loads].filter(([, count]) => count >= requiredSets);
    if (candidates.length === 1) {
      prescription = { ...prescription, weightKg: candidates[0][0] };
      baselineNote = `No planned load was set; using the consistently recorded ${prescription.weightKg} kg load as the comparison baseline. `;
    }
  }
  const daysAtCurrent = () => {
    let earliest = latest;
    for (const session of history) {
      if (session.equipmentId !== latest.equipmentId) break;
      const sets = setsFor(session);
      if (
        !sets.length ||
        !sets.every(
          (set) => Math.abs(set.weightKg - prescription.weightKg) < 0.001,
        )
      )
        break;
      earliest = session;
    }
    return (now.getTime() - Date.parse(earliest.completedAt!)) / DAY_MS;
  };
  if (rule.strategy === "review") {
    const older = sameEnvironment.filter(
      (session) =>
        (now.getTime() - Date.parse(session.completedAt!)) / DAY_MS >=
        rule.reviewDays,
    );
    if (!older.length) return null;
    const currentBest = Math.max(...latestSets.map((set) => set.weightKg));
    const oldBest = Math.max(...setsFor(older[0]).map((set) => set.weightKg));
    return currentBest <= oldBest
      ? review(
          `At least ${rule.reviewDays} days of comparable history without a higher recorded load. Review repetitions, technique and recovery; elapsed time alone does not justify an increase.`,
        )
      : null;
  }
  if (rule.strategy === "skill") {
    const successful =
      window.length === requiredSessions &&
      window.every(
        (session) =>
          session.equipmentId === latest.equipmentId &&
          setsFor(session).filter(
            (set) =>
              set.reps >= rule.repMax ||
              (prescription.durationSeconds > 0 &&
                set.durationSeconds >= prescription.durationSeconds),
          ).length >= requiredSets,
      );
    return successful
      ? review(
          `${requiredSessions} sessions met the configured skill target. Consider practicing an appropriate next variation after checking technique. Skill variants retain separate histories; no load transfers automatically.`,
        )
      : null;
  }
  if (
    window.length < requiredSessions ||
    window.some((session) => session.equipmentId !== latest.equipmentId)
  )
    return null;
  const effortOK = (set: WorkoutSet) =>
    (rule.minRir <= 0 || (set.rir !== undefined && set.rir >= rule.minRir)) &&
    (rule.maxRpe >= 10 || (set.rpe !== undefined && set.rpe <= rule.maxRpe));
  const loadOK = (set: WorkoutSet) =>
    Math.abs(set.weightKg - prescription.weightKg) < 0.001;
  const repsRequired = ["double", "volume"].includes(rule.strategy)
    ? rule.repMax
    : rule.strategy === "reps"
      ? prescription.repMax
      : rule.repMin;
  const successful = window.every(
    (session) =>
      setsFor(session).filter(
        (set) => loadOK(set) && set.reps >= repsRequired && effortOK(set),
      ).length >= requiredSets,
  );
  const evidence = `${requiredSets} sets across ${requiredSessions} consecutive comparable sessions met ${repsRequired}+ reps at the prescribed load${rule.minRir > 0 ? ` with RIR ≥${rule.minRir}` : ""}${rule.maxRpe < 10 ? ` and RPE ≤${rule.maxRpe}` : ""}.`;
  if (rule.strategy === "duration" || rule.strategy === "distance") {
    const field =
      rule.strategy === "duration" ? "durationSeconds" : "distanceKm";
    const current = prescription[field];
    if (
      !finite(current) ||
      current <= 0 ||
      !finite(rule.percentage) ||
      rule.percentage <= 0 ||
      rule.percentage > 10
    )
      return null;
    const achieved = window.every(
      (session) =>
        setsFor(session).filter((set) => set[field] >= current && effortOK(set))
          .length >= requiredSets,
    );
    const earliest = window[window.length - 1];
    if (
      !achieved ||
      (now.getTime() - Date.parse(earliest.completedAt!)) / DAY_MS <
        Math.max(0, rule.minDays)
    )
      return null;
    return create(
      field,
      current,
      current * (1 + rule.percentage / 100),
      `${requiredSessions} consecutive sessions met the ${rule.strategy} target and configured effort limits. Optional ${rule.percentage}% increase; maintain or reduce if recovery or technique worsens.`,
    );
  }
  if (successful && daysAtCurrent() >= Math.max(0, rule.minDays)) {
    if (rule.strategy === "reps") {
      if (prescription.repMax >= rule.repMax) return null;
      return create(
        "repMax",
        prescription.repMax,
        Math.min(rule.repMax, prescription.repMax + 1),
        `${evidence} Add one repetition to the upper target. Keep the load; maintaining is also valid.`,
      );
    }
    if (rule.strategy === "volume") {
      if (prescription.sets >= 10)
        return review(
          `${evidence} Volume is already high for this exercise. Review the overall weekly workload before adding sets.`,
        );
      return create(
        "sets",
        prescription.sets,
        prescription.sets + 1,
        `${evidence} Optional additional working set. This is a configurable heuristic, not a universally optimal volume prescription; keep current volume if recovery is limited.`,
        "low",
      );
    }
    if (rule.strategy === "percentage") {
      const e1rms = window
        .flatMap((session) =>
          setsFor(session).map((set) => estimated1RM(set, exercise)),
        )
        .filter((n): n is number => n !== null);
      if (
        !e1rms.length ||
        !finite(rule.percentage) ||
        rule.percentage < 30 ||
        rule.percentage > 95
      )
        return null;
      const proposed = (Math.min(...e1rms) * rule.percentage) / 100;
      return Math.abs(proposed - prescription.weightKg) < 0.05
        ? null
        : create(
            "weightKg",
            prescription.weightKg,
            proposed,
            `${rule.percentage}% of the lowest eligible recent Epley estimate (${round(Math.min(...e1rms))} kg, recorded load convention). Estimates are uncertain; select a feasible load and keep technique controlled.`,
            "low",
          );
    }
    if (
      (rule.strategy === "rir" &&
        !window.every(
          (session) =>
            setsFor(session).filter(
              (set) =>
                loadOK(set) &&
                set.reps >= repsRequired &&
                set.rir !== undefined &&
                set.rir >= rule.minRir,
            ).length >= requiredSets,
        )) ||
      (rule.strategy === "rpe" &&
        !window.every(
          (session) =>
            setsFor(session).filter(
              (set) =>
                loadOK(set) &&
                set.reps >= repsRequired &&
                set.rpe !== undefined &&
                set.rpe <= rule.maxRpe,
            ).length >= requiredSets,
        ))
    )
      return null;
    if (
      ["double", "linear", "rir", "rpe"].includes(rule.strategy) &&
      exercise.measurement === "assisted" &&
      exercise.load === "assistance"
    ) {
      if (
        !finite(rule.incrementKg) ||
        rule.incrementKg <= 0 ||
        prescription.weightKg <= 0
      )
        return null;
      return create(
        "weightKg",
        prescription.weightKg,
        Math.max(0, prescription.weightKg - rule.incrementKg),
        `${evidence} Suggest ${rule.incrementKg} kg less assistance, down to a minimum of zero. Less assistance makes the same movement harder. Keep current assistance if technique deteriorates.`,
      );
    }
    if (
      ["double", "linear", "rir", "rpe"].includes(rule.strategy) &&
      !["none", "assistance"].includes(exercise.load) &&
      exercise.measurement !== "cardio" &&
      exercise.measurement !== "duration"
    ) {
      if (!finite(rule.incrementKg) || rule.incrementKg <= 0) return null;
      return create(
        "weightKg",
        prescription.weightKg,
        prescription.weightKg + rule.incrementKg,
        `${evidence} Suggest +${rule.incrementKg} kg in this exercise's load convention. Choose the nearest feasible equipment increment; maintain the load or adjust targets if needed.`,
      );
    }
  }
  const plateauLength = Math.max(3, Math.ceil(rule.plateauSessions));
  if (finite(plateauLength) && history.length >= plateauLength) {
    const plateau = history.slice(0, plateauLength);
    const best = plateau.map((session) =>
      Math.max(
        ...setsFor(session)
          .filter(loadOK)
          .map((set) => set.reps),
        0,
      ),
    );
    if (
      plateau.every((session) => session.equipmentId === latest.equipmentId) &&
      best.every((value) => value > 0 && value <= best[best.length - 1]) &&
      best.every((value) => value < rule.repMax)
    ) {
      return review(
        `${plateauLength} comparable sessions show no improvement in best reps at the current load, below the upper target. Review technique, recovery, or consider a lighter week. This signal is uncertain and does not diagnose fatigue.`,
      );
    }
  }
  return null;
}

function matchingSets(
  goal: Goal,
  data: AppData,
): { set: WorkoutSet; exercise: Exercise }[] {
  return completedSessions(data.sessions).flatMap((session) =>
    session.exercises
      .filter(
        (entry) => !goal.exerciseId || goal.exerciseId === entry.exerciseId,
      )
      .flatMap((entry) =>
        entry.sets
          .filter(workingSet)
          .map((set) => ({ set, exercise: entry.exercise })),
      ),
  );
}

export function goalValue(goal: Goal, data: AppData): number {
  const sets = matchingSets(goal, data);
  const max = (values: number[]) => (values.length ? Math.max(...values) : 0);
  const resistanceSets = sets.filter(
    ({ exercise }) =>
      ["weight-reps", "bodyweight"].includes(exercise.measurement) &&
      exercise.load !== "assistance",
  );
  switch (goal.type) {
    case "weight":
      return fromKg(
        max(resistanceSets.map(({ set }) => nonnegative(set.weightKg))),
        goal.unit === "lb" ? "lb" : "kg",
      );
    case "reps":
      return max(
        sets
          .filter(
            ({ exercise }) =>
              !["cardio", "duration"].includes(exercise.measurement),
          )
          .map(({ set }) => nonnegative(set.reps)),
      );
    case "e1rm":
      return fromKg(
        max(sets.map(({ set, exercise }) => estimated1RM(set, exercise) ?? 0)),
        goal.unit === "lb" ? "lb" : "kg",
      );
    case "relative": {
      const bodyweight = data.profile.bodyweightKg;
      return bodyweight && bodyweight > 0
        ? max(
            sets
              .filter(({ exercise }) => exercise.load === "total")
              .map(({ set, exercise }) => estimated1RM(set, exercise) ?? 0),
          ) / bodyweight
        : 0;
    }
    case "frequency": {
      const start = weekStart();
      return new Set(
        completedSessions(data.sessions)
          .filter((session) => dateKey(new Date(session.completedAt!)) >= start)
          .map((session) => dateKey(new Date(session.completedAt!))),
      ).size;
    }
    case "volume": {
      const row = muscleVolume(
        data.sessions,
        data.exercises,
        weekStart(),
        data.profile.indirectFactor,
      ).find((value) => value.muscle === goal.muscle);
      return goal.muscle
        ? (row?.direct ?? 0) + (row?.indirect ?? 0)
        : completedSessions(data.sessions)
            .filter(
              (session) =>
                dateKey(new Date(session.completedAt!)) >= weekStart(),
            )
            .reduce(
              (count, session) =>
                count +
                session.exercises
                  .filter(
                    (entry) =>
                      !goal.exerciseId || entry.exerciseId === goal.exerciseId,
                  )
                  .filter(
                    (entry) =>
                      entry.exercise.measurement !== "cardio" &&
                      !/stretch|mobility/i.test(entry.exercise.category),
                  )
                  .reduce(
                    (sum, entry) => sum + entry.sets.filter(workingSet).length,
                    0,
                  ),
              0,
            );
    }
    case "duration":
    case "hold": {
      const seconds =
        goal.type === "hold"
          ? max(
              sets
                .filter(({ exercise }) => exercise.measurement === "duration")
                .map(({ set }) => nonnegative(set.durationSeconds)),
            )
          : max(sets.map(({ set }) => nonnegative(set.durationSeconds)));
      return goal.unit === "min" ? seconds / 60 : seconds;
    }
    case "distance": {
      const km = sets
        .filter(({ exercise }) => exercise.measurement === "cardio")
        .reduce((sum, { set }) => sum + nonnegative(set.distanceKm), 0);
      return goal.unit === "mi" ? km / 1.609344 : km;
    }
    case "pace": {
      const pace = sets
        .filter(
          ({ exercise, set }) =>
            exercise.measurement === "cardio" &&
            set.distanceKm > 0 &&
            set.durationSeconds > 0,
        )
        .map(
          ({ set }) =>
            (set.durationSeconds / 60 / set.distanceKm) *
            (goal.unit === "min/mi" ? 1.609344 : 1),
        );
      return pace.length ? Math.min(...pace) : goal.current;
    }
    case "bodyweight": {
      const latest =
        [...data.bodyMetrics].sort((a, b) => b.date.localeCompare(a.date))[0]
          ?.weightKg ?? data.profile.bodyweightKg;
      return latest
        ? fromKg(latest, goal.unit === "lb" ? "lb" : "kg")
        : goal.current;
    }
    case "skill":
    case "custom":
      return goal.current;
  }
}

export function goalProgress(goal: Goal): number {
  if (![goal.start, goal.current, goal.target].every(finite)) return 0;
  if (goal.target === goal.start) return goal.current === goal.target ? 1 : 0;
  return Math.min(
    1,
    Math.max(0, (goal.current - goal.start) / (goal.target - goal.start)),
  );
}

/** Calendar-week streak, counted in training days. An unfinished current week gets a grace period. */
export function weeklyStreak(
  sessions: Session[],
  target: number,
  now = new Date(),
): number {
  if (!finite(target) || target < 1 || target > 7 || !finite(now.getTime()))
    return 0;
  const weeks = new Map<string, Set<string>>();
  for (const session of completedSessions(sessions)) {
    if (Date.parse(session.completedAt!) > now.getTime()) continue;
    const day = dateKey(new Date(session.completedAt!)),
      week = weekStart(day);
    if (!weeks.has(week)) weeks.set(week, new Set());
    weeks.get(week)!.add(day);
  }
  let cursor = weekStart(dateKey(now));
  if ((weeks.get(cursor)?.size ?? 0) < target) cursor = addDays(cursor, -7);
  let streak = 0;
  while ((weeks.get(cursor)?.size ?? 0) >= target) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function personalRecords(sessions: Session[]): {
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: number;
  unit: string;
}[] {
  const records = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      type: string;
      value: number;
      unit: string;
    }
  >();
  const offer = (
    exercise: Exercise,
    type: string,
    value: number,
    unit: string,
    lower = false,
    allowZero = false,
  ) => {
    if (!finite(value) || value < 0 || (!allowZero && value === 0)) return;
    const key = `${exercise.id}:${exercise.load}:${exercise.measurement}:${type}`;
    const existing = records.get(key);
    if (!existing || (lower ? value < existing.value : value > existing.value))
      records.set(key, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        type,
        value,
        unit,
      });
  };
  for (const session of completedSessions(sessions))
    for (const entry of session.exercises)
      for (const set of entry.sets.filter(workingSet)) {
        const exercise = entry.exercise;
        if (exercise.measurement === "cardio") {
          offer(exercise, "Longest distance", set.distanceKm, "km");
          offer(exercise, "Longest duration", set.durationSeconds, "seconds");
          if (set.distanceKm > 0 && set.durationSeconds > 0)
            offer(
              exercise,
              "Fastest pace",
              set.durationSeconds / 60 / set.distanceKm,
              "min/km",
              true,
            );
        } else if (exercise.measurement === "duration")
          offer(exercise, "Longest hold", set.durationSeconds, "seconds");
        else if (exercise.measurement === "assisted") {
          // Less assistance is progress. Never label the most assistance as a load PR.
          offer(exercise, "Least assistance", set.weightKg, "kg", true, true);
          offer(
            exercise,
            `Most reps at ${round(set.weightKg)} kg assistance`,
            set.reps,
            "reps",
          );
        } else {
          if (exercise.load !== "none")
            offer(
              exercise,
              exercise.load === "per-hand"
                ? "Heaviest per hand"
                : exercise.load === "added"
                  ? "Heaviest added load"
                  : "Heaviest load",
              set.weightKg,
              "kg",
            );
          offer(
            exercise,
            exercise.measurement === "bodyweight" && set.weightKg === 0
              ? "Most bodyweight reps"
              : `Most reps at ${round(set.weightKg)} kg`,
            set.reps,
            "reps",
          );
          offer(
            exercise,
            "Estimated 1RM",
            estimated1RM(set, exercise) ?? 0,
            "kg",
          );
        }
      }
  return [...records.values()];
}

export function achievements(
  sessions: Session[],
  target: number,
): { id: string; name: string; description: string; unlocked: boolean }[] {
  const completed = completedSessions(sessions);
  const weekDays = new Map<string, Set<string>>();
  for (const session of completed) {
    const day = dateKey(new Date(session.completedAt!));
    const key = weekStart(day);
    if (!weekDays.has(key)) weekDays.set(key, new Set());
    weekDays.get(key)!.add(day);
  }
  const fullWeek =
    target >= 1 && [...weekDays.values()].some((days) => days.size >= target);
  const bestStreak = Math.max(
    0,
    ...completed.map((session) =>
      weeklyStreak(completed, target, new Date(session.completedAt!)),
    ),
  );
  const dates = completed
    .map((session) => Date.parse(session.completedAt!))
    .sort((a, b) => a - b);
  const returned = dates.some(
    (date, index) => index > 0 && date - dates[index - 1] >= 28 * DAY_MS,
  );
  return [
    {
      id: "first",
      name: "The first step",
      description: "Complete your first workout.",
      unlocked: completed.length >= 1,
    },
    {
      id: "week",
      name: "A week well spent",
      description: "Meet your weekly training-day target.",
      unlocked: fullWeek,
    },
    {
      id: "four-weeks",
      name: "Finding your rhythm",
      description:
        "Meet your target four consecutive weeks. Rest days count as recovery.",
      unlocked: bestStreak >= 4,
    },
    ...[10, 50, 100].map((count) => ({
      id: `sessions-${count}`,
      name: `${count} workouts`,
      description: `Complete ${count} saved workouts.`,
      unlocked: completed.length >= count,
    })),
    {
      id: "return",
      name: "Welcome back",
      description: "Complete a workout after at least four weeks away.",
      unlocked: returned,
    },
    {
      id: "distance-5",
      name: "Going the distance",
      description: "Record a 5 km cardio effort.",
      unlocked: completed.some((session) =>
        session.exercises.some(
          (entry) =>
            entry.exercise.measurement === "cardio" &&
            entry.sets.some((set) => workingSet(set) && set.distanceKm >= 5),
        ),
      ),
    },
    {
      id: "bodyweight-10",
      name: "Bodyweight foundation",
      description: "Log ten unassisted bodyweight repetitions in a set.",
      unlocked: completed.some((session) =>
        session.exercises.some(
          (entry) =>
            entry.exercise.measurement === "bodyweight" &&
            entry.sets.some(
              (set) => workingSet(set) && set.reps >= 10 && set.weightKg === 0,
            ),
        ),
      ),
    },
  ];
}

export function strengthTier(
  exercise: Exercise,
  loadKg: number,
  bodyweightKg: number,
  thresholds?: { label: string; ratio: number }[],
): { ratio: number; label: string; description: string } | null {
  if (
    exercise.measurement !== "weight-reps" ||
    exercise.load !== "total" ||
    !finite(loadKg) ||
    !finite(bodyweightKg) ||
    bodyweightKg <= 0 ||
    loadKg <= 0
  )
    return null;
  const defaults: Record<string, number[]> = {
    "ex-barbell-bench-press-medium-grip": [0, 0.5, 0.75, 1, 1.5],
    "ex-barbell-squat": [0, 0.75, 1, 1.5, 2],
    "ex-barbell-full-squat": [0, 0.75, 1, 1.5, 2],
    "ex-barbell-deadlift": [0, 1, 1.25, 1.75, 2.5],
  };
  const labels = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
  const ranges =
    thresholds ??
    defaults[exercise.id]?.map((ratio, index) => ({
      label: labels[index],
      ratio,
    }));
  if (
    !ranges?.length ||
    ranges.some((range) => !finite(range.ratio) || range.ratio < 0)
  )
    return null;
  const sorted = [...ranges].sort((a, b) => a.ratio - b.ratio),
    ratio = loadKg / bodyweightKg;
  const label =
    sorted.filter((range) => ratio >= range.ratio).at(-1)?.label ??
    sorted[0].label;
  return {
    ratio,
    label,
    description:
      "Informal, configurable motivational benchmark for this lift; not a scientific norm. Technique, sex, age and experience change comparisons. Identify estimated versus tested loads.",
  };
}
