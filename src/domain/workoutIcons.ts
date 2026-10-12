import type { Template } from "./types";

export const workoutIconIds = [
  "full-body",
  "barbell",
  "dumbbell",
  "bench",
  "upper-body",
  "lower-body",
  "push",
  "pull",
  "legs",
  "core",
  "bodyweight",
  "running",
  "cycling",
  "rowing",
  "walking",
  "mobility",
  "recovery",
  "timer",
  "home",
  "hybrid",
  "hinge",
  "strength",
] as const;
export type WorkoutIconId = (typeof workoutIconIds)[number];
export const workoutIcons: readonly { id: WorkoutIconId; label: string }[] = [
  { id: "full-body", label: "Full body" },
  { id: "barbell", label: "Barbell lifts" },
  { id: "dumbbell", label: "Dumbbell training" },
  { id: "bench", label: "Bench press" },
  { id: "upper-body", label: "Upper body" },
  { id: "lower-body", label: "Lower body" },
  { id: "push", label: "Push workout" },
  { id: "pull", label: "Pull workout" },
  { id: "legs", label: "Leg training" },
  { id: "core", label: "Core training" },
  { id: "bodyweight", label: "Bodyweight training" },
  { id: "running", label: "Running" },
  { id: "cycling", label: "Cycling" },
  { id: "rowing", label: "Rowing" },
  { id: "walking", label: "Walking" },
  { id: "mobility", label: "Mobility" },
  { id: "recovery", label: "Recovery" },
  { id: "timer", label: "Short workout" },
  { id: "home", label: "Home training" },
  { id: "hybrid", label: "Hybrid training" },
  { id: "hinge", label: "Hip hinge" },
  { id: "strength", label: "Strength training" },
];

export const defaultWorkoutIcons: Record<string, WorkoutIconId> = {
  "tpl-full-a": "full-body",
  "tpl-full-b": "hinge",
  "tpl-upper-a": "upper-body",
  "tpl-lower-a": "lower-body",
  "tpl-upper-b": "dumbbell",
  "tpl-lower-b": "barbell",
  "tpl-push": "push",
  "tpl-pull": "pull",
  "tpl-legs": "legs",
  "tpl-strength": "strength",
  "tpl-bodyweight": "bodyweight",
  "tpl-general": "walking",
  "tpl-hybrid": "hybrid",
  "tpl-upper-short": "timer",
  "tpl-home": "home",
};

/** Older backups without an icon retain a useful default without a migration. */
export function getWorkoutIconId(
  template: Partial<Pick<Template, "id" | "focus" | "icon">>,
): WorkoutIconId {
  if (template.icon && workoutIconIds.includes(template.icon))
    return template.icon;
  if (template.id && defaultWorkoutIcons[template.id])
    return defaultWorkoutIcons[template.id];
  switch (template.focus) {
    case "Strength":
      return "barbell";
    case "Cardio":
      return "running";
    case "Endurance":
      return "timer";
    case "Calisthenics":
      return "bodyweight";
    case "Hybrid":
      return "hybrid";
    case "Hypertrophy":
      return "dumbbell";
    default:
      return "full-body";
  }
}

export const workoutIconLabel = (icon: WorkoutIconId) =>
  workoutIcons.find((item) => item.id === icon)!.label;
