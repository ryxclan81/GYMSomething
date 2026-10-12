import type { Exercise, Prescription } from "./types";
export const id = () => crypto.randomUUID();
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(key: string, days: number): string {
  const date = parseDate(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export function weekStart(key = dateKey()): string {
  const date = parseDate(key);
  return addDays(key, -((date.getDay() + 6) % 7));
}
export function prescription(exercise: Exercise): Prescription {
  return {
    id: id(),
    exerciseId: exercise.id,
    sets:
      exercise.defaultTargets?.sets ??
      (exercise.measurement === "cardio" ? 1 : 3),
    repMin: exercise.defaultTargets?.repMin ?? 8,
    repMax: exercise.defaultTargets?.repMax ?? 12,
    weightKg: 0,
    restSeconds: exercise.defaultTargets?.restSeconds ?? 90,
    durationSeconds:
      exercise.defaultTargets?.durationSeconds ??
      (exercise.measurement === "cardio" ? 1200 : 30),
    distanceKm: exercise.defaultTargets?.distanceKm ?? 0,
    group: "",
    notes: "",
    rule: exercise.progression
      ? structuredClone(exercise.progression)
      : undefined,
  };
}
export const formatDate = (
  key: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => parseDate(key).toLocaleDateString(undefined, options);
export const formatTime = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`;
