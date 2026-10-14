import type {
  Exercise,
  Session,
  SessionExercise,
  Template,
  WorkoutSet,
} from "./types";
import { id } from "./helpers";
import { validateSet } from "./session";

export type CircuitClock = NonNullable<Session["circuit"]>;

export function validateCircuitTemplate(
  template: Template,
  exercises: Exercise[],
): string | null {
  if (!template.circuit) return null;
  const seconds = template.circuit.durationSeconds;
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400)
    return "Choose a circuit time between 1 second and 24 hours.";
  if (!template.exercises.length)
    return "Add at least one movement to your circuit.";
  for (const p of template.exercises) {
    const exercise = exercises.find((e) => e.id === p.exerciseId);
    if (!exercise)
      return "A circuit movement is missing from the exercise library.";
    const error = validateSet(
      circuitTargetSet({ exercise, prescription: p }, 1),
      exercise,
    );
    if (error) return `${exercise.name}: ${error}`;
  }
  return null;
}

/** Targets remain uncompleted until the user explicitly records their actual work. */
export function circuitTargetSet(
  entry: Pick<SessionExercise, "exercise" | "prescription">,
  round: number,
): WorkoutSet {
  const timed =
    entry.exercise.measurement === "duration" ||
    entry.exercise.measurement === "cardio";
  return {
    id: id(),
    circuitRound: round,
    weightKg: entry.prescription.weightKg,
    reps: timed ? 0 : entry.prescription.repMin,
    durationSeconds: timed ? entry.prescription.durationSeconds : 0,
    distanceKm: timed ? entry.prescription.distanceKm : 0,
    type: timed ? "timed" : "amrap",
    completed: false,
    skipped: false,
  };
}

export function circuitElapsedMs(
  clock: CircuitClock,
  now = Date.now(),
): number {
  return (
    Math.max(0, clock.elapsedMs) +
    (clock.startedAt === undefined ? 0 : Math.max(0, now - clock.startedAt))
  );
}
export function pauseCircuit(
  clock: CircuitClock,
  now = Date.now(),
): CircuitClock {
  return {
    ...clock,
    elapsedMs: circuitElapsedMs(clock, now),
    startedAt: undefined,
  };
}
export function resumeCircuit(
  clock: CircuitClock,
  now = Date.now(),
): CircuitClock {
  return clock.startedAt === undefined
    ? { ...clock, startedAt: now, finishedAt: undefined }
    : { ...clock };
}
/** Reset only the clock; recorded rounds and repetitions remain intact. */
export function resetCircuitClock(clock: CircuitClock): CircuitClock {
  return {
    ...clock,
    elapsedMs: 0,
    startedAt: undefined,
    finishedAt: undefined,
  };
}
export function finishCircuit(
  clock: CircuitClock,
  now = Date.now(),
): CircuitClock {
  return { ...pauseCircuit(clock, now), finishedAt: now };
}

export function currentCircuitSet(
  entry: SessionExercise,
  round: number,
): WorkoutSet | undefined {
  return entry.sets.find((set) => set.circuitRound === round);
}

/** Confirm the current movement or remaining round as actual work. No timer tick calls this. */
export function logCircuitRound(
  session: Session,
  exerciseId?: string,
  now = Date.now(),
): void {
  const circuit = session.circuit;
  if (!circuit || session.completedAt)
    throw new Error("This circuit is not active.");
  if (circuit.finishedAt !== undefined)
    throw new Error("Resume the circuit before recording another round.");
  if (circuit.round >= 10000)
    throw new Error("Finish this workout before recording more rounds.");
  const targets = session.exercises.flatMap((entry) => {
    const set = currentCircuitSet(entry, circuit.round);
    return set &&
      !set.completed &&
      !set.skipped &&
      (!exerciseId || entry.id === exerciseId)
      ? [{ entry, set }]
      : [];
  });
  if (!targets.length)
    throw new Error("There is no unfinished movement to record.");
  // Validate the whole action before mutating any movement.
  for (const { entry, set } of targets) {
    const error = validateSet(set, entry.exercise);
    if (error) throw new Error(`${entry.exercise.name}: ${error}`);
  }
  for (const { set } of targets) {
    set.completed = true;
    set.completedAt = new Date(now).toISOString();
  }
  const unfinished = session.exercises.some((entry) => {
    const set = currentCircuitSet(entry, circuit.round);
    return set && !set.completed && !set.skipped;
  });
  if (!unfinished) {
    const included = session.exercises.filter((entry) => {
      const set = currentCircuitSet(entry, circuit.round);
      return set && !set.skipped;
    });
    circuit.round++;
    for (const entry of included)
      entry.sets.push(circuitTargetSet(entry, circuit.round));
  }
}

export function circuitRoundStats(session: Session): {
  completed: number;
  partial: number;
  reps: number;
} {
  const rounds = new Map<number, WorkoutSet[]>();
  let reps = 0;
  for (const entry of session.exercises)
    for (const set of entry.sets) {
      if (set.circuitRound === undefined) continue;
      const list = rounds.get(set.circuitRound) ?? [];
      list.push(set);
      rounds.set(set.circuitRound, list);
      if (set.completed && !set.skipped) reps += set.reps;
    }
  let completed = 0,
    partial = 0;
  for (const sets of rounds.values()) {
    const included = sets.filter((set) => !set.skipped);
    const actual = included.filter((set) => set.completed).length;
    if (actual && actual === included.length) completed++;
    else if (actual) partial++;
  }
  return { completed, partial, reps };
}

/** History corrections may edit actual values, reorder or remove records, never invent round slots. */
export function correctCircuitHistory(
  session: Session,
  change: (draft: Session) => void,
): Session {
  const next = structuredClone(session);
  change(next);
  if (!session.circuit) return next;
  const entries = new Map(session.exercises.map((entry) => [entry.id, entry]));
  const incompatible = next.exercises.some((entry) => {
    const original = entries.get(entry.id);
    if (!original || entry.exerciseId !== original.exerciseId) return true;
    const sets = new Map(original.sets.map((set) => [set.id, set]));
    return (
      entry.sets.length !== original.sets.length ||
      new Set(entry.sets.map((set) => set.id)).size !== entry.sets.length ||
      entry.sets.some(
        (set) =>
          !sets.has(set.id) ||
          set.circuitRound !== sets.get(set.id)!.circuitRound,
      )
    );
  });
  if (
    incompatible ||
    next.exercises.length !== session.exercises.length ||
    new Set(next.exercises.map((entry) => entry.id)).size !==
      next.exercises.length ||
    JSON.stringify(next.circuit) !== JSON.stringify(session.circuit)
  )
    throw new Error(
      "Circuit history keeps its recorded movements and rounds. Correct actual values or start a new workout to add or substitute movements.",
    );
  return next;
}

/** Persist valid numeric values while NumericInput keeps the user's editing draft separate. */
export function normalizeCircuitSetPatch(
  patch: Partial<WorkoutSet>,
): Partial<WorkoutSet> {
  const safePatch = { ...patch };
  for (const field of [
    "weightKg",
    "reps",
    "durationSeconds",
    "distanceKm",
    "rir",
    "rpe",
  ] as const) {
    const value = safePatch[field];
    if (value === undefined) continue;
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    safePatch[field] =
      field === "reps"
        ? Math.floor(safe)
        : field === "rir" || field === "rpe"
          ? Math.min(10, safe)
          : safe;
  }
  return safePatch;
}

/** Keep the round slot so a removed movement leaves an honest partial round. */
export function removeCircuitRecord(
  session: Session,
  exerciseId: string,
  setId: string,
): void {
  const set = session.exercises
    .find((entry) => entry.id === exerciseId)
    ?.sets.find((item) => item.id === setId);
  if (!session.circuit || !set) return;
  set.completed = false;
  set.skipped = false;
  set.completedAt = undefined;
}
