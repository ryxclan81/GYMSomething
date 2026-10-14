import type {
  AppData,
  Exercise,
  Prescription,
  Session,
  SessionExercise,
  Template,
  WorkoutSet,
} from "./types";
import { id, prescription } from "./helpers";
import {
  circuitTargetSet,
  finishCircuit,
  validateCircuitTemplate,
} from "./circuit";
export function makeSet(p: Prescription, previous?: WorkoutSet): WorkoutSet {
  return {
    id: id(),
    weightKg: previous?.weightKg ?? p.weightKg,
    reps: previous?.reps ?? p.repMin,
    rir: previous?.rir ?? p.rir,
    rpe: previous?.rpe ?? p.rpe,
    durationSeconds: previous?.durationSeconds ?? p.durationSeconds,
    distanceKm: previous?.distanceKm ?? p.distanceKm,
    type: previous?.type ?? "working",
    completed: false,
    skipped: false,
  };
}
export function makeSessionExercise(
  exercise: Exercise,
  p = prescription(exercise),
  previous?: SessionExercise,
): SessionExercise {
  return {
    id: id(),
    exerciseId: exercise.id,
    exercise: structuredClone(exercise),
    prescription: structuredClone(p),
    sets: Array.from({ length: p.sets }, (_, i) => {
      const prior = previous?.sets.filter(
        (s) => s.completed && !s.skipped && s.type !== "warmup",
      )[i];
      const set = makeSet(p, prior);
      if (!prior && ["duration", "cardio"].includes(exercise.measurement))
        set.type = "timed";
      if (previous) {
        if (p.weightKg !== previous.prescription.weightKg)
          set.weightKg = p.weightKg;
        if (
          p.repMin !== previous.prescription.repMin ||
          p.repMax !== previous.prescription.repMax
        )
          set.reps = p.repMin;
        if (p.durationSeconds !== previous.prescription.durationSeconds)
          set.durationSeconds = p.durationSeconds;
        if (p.distanceKm !== previous.prescription.distanceKm)
          set.distanceKm = p.distanceKm;
      }
      return set;
    }),
    notes: "",
  };
}
export function createSession(
  data: AppData,
  template?: Template,
  scheduleId?: string,
): Session {
  if (template?.circuit) {
    const error = validateCircuitTemplate(template, data.exercises);
    if (error) throw new Error(error);
  }
  const session: Session = {
    id: id(),
    name: template?.name ?? "Open workout",
    templateId: template?.id,
    scheduleId,
    equipmentId: data.activeEquipmentId,
    startedAt: new Date().toISOString(),
    exercises:
      template?.exercises.map((p) => {
        const ex = data.exercises.find((e) => e.id === p.exerciseId);
        if (!ex) throw new Error("An exercise is missing from this template.");
        const previous = [...data.sessions]
          .filter((s) => s.equipmentId === data.activeEquipmentId)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
          .flatMap((s) => s.exercises)
          .find((e) => e.exerciseId === p.exerciseId);
        return makeSessionExercise(ex, p, previous);
      }) ?? [],
    notes: "",
  };
  if (template?.circuit) {
    session.circuit = {
      durationSeconds: template.circuit.durationSeconds,
      elapsedMs: 0,
      round: 1,
    };
    session.exercises.forEach((entry) => {
      entry.sets = [circuitTargetSet(entry, 1)];
    });
  }
  return session;
}
export function validateSet(
  set: WorkoutSet,
  exercise: Exercise,
): string | null {
  if (!Number.isFinite(set.weightKg) || set.weightKg < 0)
    return "Enter a nonnegative weight.";
  if (
    exercise.measurement === "cardio" ||
    exercise.measurement === "duration"
  ) {
    if (!Number.isFinite(set.durationSeconds) || set.durationSeconds <= 0)
      return "Enter a duration greater than zero.";
    if (!Number.isFinite(set.distanceKm) || set.distanceKm < 0)
      return "Distance cannot be negative.";
  } else if (!Number.isInteger(set.reps) || set.reps <= 0)
    return "Enter at least one whole repetition.";
  if (
    set.rir !== undefined &&
    (!Number.isFinite(set.rir) || set.rir < 0 || set.rir > 10)
  )
    return "RIR must be between 0 and 10.";
  if (
    set.rpe !== undefined &&
    (!Number.isFinite(set.rpe) || set.rpe < 0 || set.rpe > 10)
  )
    return "RPE must be between 0 and 10.";
  return null;
}
export function completeSession(data: AppData, session: Session): boolean {
  if (
    session.circuit &&
    !session.exercises.some((entry) =>
      entry.sets.some((set) => set.completed && !set.skipped),
    )
  )
    throw new Error("Record at least one circuit movement before saving.");
  if (session.circuit && !session.completedAt)
    session.circuit = finishCircuit(session.circuit);
  const existing = data.sessions.findIndex((s) => s.id === session.id);
  if (existing >= 0) {
    data.sessions[existing] = structuredClone(session);
    if (data.activeSession?.id === session.id) data.activeSession = null;
    return false;
  }
  const completed = {
    ...structuredClone(session),
    completedAt: new Date().toISOString(),
    restEndsAt: undefined,
    restPausedSeconds: undefined,
  };
  data.sessions.push(completed);
  if (data.activeSession?.id === session.id) data.activeSession = null;
  if (session.scheduleId) {
    const scheduled = data.schedule.find((s) => s.id === session.scheduleId);
    if (scheduled) {
      scheduled.status = "completed";
      scheduled.sessionId = session.id;
    }
  }
  return true;
}
