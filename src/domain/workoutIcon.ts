import type { Exercise, Template } from "./types";

export type BodyRegion =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";
export type WorkoutIconKind =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "upper-body"
  | "full-body"
  | "cardio"
  | "mobility"
  | "general";

type MuscleExercise = Pick<
  Exercise,
  "id" | "primary" | "secondary" | "measurement" | "category"
>;
export interface WorkoutIconData {
  kind: WorkoutIconKind;
  label: string;
  primary: BodyRegion[];
  secondary: BodyRegion[];
  view: "front" | "back";
}

const aliases: Record<string, BodyRegion> = {
  chest: "chest",
  pectorals: "chest",
  pectoralis: "chest",
  pecs: "chest",
  back: "back",
  "upper back": "back",
  "lower back": "back",
  lats: "back",
  latissimus: "back",
  "latissimus dorsi": "back",
  traps: "back",
  trapezius: "back",
  rhomboids: "back",
  shoulders: "shoulders",
  shoulder: "shoulders",
  delts: "shoulders",
  deltoids: "shoulders",
  "front delts": "shoulders",
  "rear delts": "shoulders",
  "side delts": "shoulders",
  biceps: "biceps",
  "biceps brachii": "biceps",
  triceps: "triceps",
  "triceps brachii": "triceps",
  forearms: "forearms",
  forearm: "forearms",
  brachialis: "biceps",
  core: "core",
  abs: "core",
  abdominals: "core",
  obliques: "core",
  "rectus abdominis": "core",
  glutes: "glutes",
  gluteals: "glutes",
  "gluteus maximus": "glutes",
  "gluteus medius": "glutes",
  quads: "quads",
  quadriceps: "quads",
  "hip flexors": "quads",
  adductors: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  calf: "calves",
  gastrocnemius: "calves",
  soleus: "calves",
};
const group: Record<
  BodyRegion,
  "chest" | "back" | "shoulders" | "arms" | "core" | "legs"
> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  core: "core",
  glutes: "legs",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
};
const labels: Record<WorkoutIconKind, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Lower body",
  core: "Core",
  "upper-body": "Upper body",
  "full-body": "Full body",
  cardio: "Cardio",
  mobility: "Mobility",
  general: "Workout",
};

export function muscleRegion(muscle: string): BodyRegion | undefined {
  return aliases[
    muscle.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ")
  ];
}

/** A visual summary of selected exercises, not muscle-volume or recovery analytics. */
export function getWorkoutIconData(
  template: Pick<Template, "exercises">,
  exercises: readonly MuscleExercise[],
): WorkoutIconData {
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const selected = template.exercises.flatMap((prescription) => {
    const exercise = catalog.get(prescription.exerciseId);
    return exercise
      ? [
          {
            exercise,
            sets: Number.isFinite(prescription.sets)
              ? Math.max(1, prescription.sets)
              : 1,
          },
        ]
      : [];
  });
  const primary = new Set<BodyRegion>(),
    secondary = new Set<BodyRegion>();
  const primaryNames = new Set<string>(),
    secondaryNames = new Set<string>();
  const primaryScores = new Map<BodyRegion, number>(),
    secondaryScores = new Map<BodyRegion, number>();
  for (const { exercise, sets } of selected) {
    for (const [muscles, regions, names, scores] of [
      [exercise.primary, primary, primaryNames, primaryScores],
      [exercise.secondary, secondary, secondaryNames, secondaryScores],
    ] as const) {
      const perExercise = new Set<BodyRegion>();
      for (const muscle of muscles) {
        if (muscle.trim()) names.add(muscle.trim());
        const region = muscleRegion(muscle);
        if (region) {
          regions.add(region);
          perExercise.add(region);
        }
      }
      for (const region of perExercise)
        scores.set(region, (scores.get(region) ?? 0) + sets);
    }
  }
  for (const region of primary) secondary.delete(region);
  for (const name of primaryNames) secondaryNames.delete(name);
  const scores = primaryScores.size ? primaryScores : secondaryScores;
  const groups = new Map<string, number>();
  for (const [region, score] of scores)
    groups.set(group[region], (groups.get(group[region]) ?? 0) + score);
  const ordered = [...groups].sort(
    ([a, av], [b, bv]) => bv - av || a.localeCompare(b),
  );
  const total = ordered.reduce((sum, [, score]) => sum + score, 0);
  const lower = groups.get("legs") ?? 0;
  const upper = ["chest", "back", "shoulders", "arms"].reduce(
    (sum, key) => sum + (groups.get(key) ?? 0),
    0,
  );
  let kind: WorkoutIconKind =
    (ordered[0]?.[0] as WorkoutIconKind | undefined) ?? "general";
  if (total && lower / total >= 0.25 && upper / total >= 0.25)
    kind = "full-body";
  else if (
    total &&
    !lower &&
    upper / total >= 0.75 &&
    ordered.length > 1 &&
    ordered[0][1] / total < 0.5
  )
    kind = "upper-body";
  if (
    selected.length &&
    selected.every(({ exercise }) => exercise.measurement === "cardio")
  )
    kind = "cardio";
  else if (
    selected.length &&
    selected.every(
      ({ exercise }) => exercise.category.toLowerCase() === "mobility",
    )
  )
    kind = "mobility";
  const posterior = ["back", "glutes", "hamstrings"].reduce(
    (sum, region) => sum + (scores.get(region as BodyRegion) ?? 0),
    0,
  );
  const anterior = ["chest", "core", "quads"].reduce(
    (sum, region) => sum + (scores.get(region as BodyRegion) ?? 0),
    0,
  );
  const detail = [
    primaryNames.size ? `Primary muscles: ${[...primaryNames].join(", ")}` : "",
    secondaryNames.size
      ? `Supporting muscles: ${[...secondaryNames].join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(". ");
  return {
    kind,
    label: `${labels[kind]}${detail ? `. ${detail}` : ""}`,
    primary: [...primary],
    secondary: [...secondary],
    view:
      kind === "back" || (kind !== "chest" && posterior > anterior)
        ? "back"
        : "front",
  };
}
