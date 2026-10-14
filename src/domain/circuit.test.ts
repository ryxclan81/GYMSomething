import { describe, expect, it } from "vitest";
import { defaultData } from "../data/defaults";
import { prescription } from "./helpers";
import {
  createSession,
  completeSession,
  makeSet,
  makeSessionExercise,
} from "./session";
import type { Template } from "./types";
import {
  circuitElapsedMs,
  circuitRoundStats,
  currentCircuitSet,
  finishCircuit,
  logCircuitRound,
  pauseCircuit,
  resetCircuitClock,
  resumeCircuit,
  validateCircuitTemplate,
  correctCircuitHistory,
  normalizeCircuitSetPatch,
  removeCircuitRecord,
} from "./circuit";
import { sessionStats, adaptWorkoutSession } from "./engine";
import { validateBackup } from "../state/store";
import { decodePersistedData, encodePersistedData } from "../state/persistence";
import { deleteTemplate } from "./templates";

function fixture() {
  const data = defaultData();
  const template: Template = {
    id: "circuit-example",
    name: "5 / 10 / 15 repeat",
    focus: "Calisthenics",
    minutes: 20,
    description: "",
    updatedAt: new Date().toISOString(),
    circuit: { durationSeconds: 1200 },
    exercises: ["ex-pullups", "ex-pushups", "ex-bodyweight-squat"].map(
      (id, i) => ({
        ...prescription(data.exercises.find((ex) => ex.id === id)!),
        sets: 1,
        repMin: [5, 10, 15][i],
        repMax: [5, 10, 15][i],
        restSeconds: 0,
      }),
    ),
  };
  data.templates.push(template);
  const session = createSession(data, template);
  data.activeSession = session;
  return { data, template, session };
}

describe("timed repeat circuits", () => {
  it("starts with one unrecorded target per movement and zero actual work", () => {
    const { session } = fixture();
    expect(session.circuit).toEqual({
      durationSeconds: 1200,
      elapsedMs: 0,
      round: 1,
    });
    expect(session.exercises.map((e) => e.sets[0].reps)).toEqual([5, 10, 15]);
    expect(
      session.exercises.every(
        (e) => e.sets.length === 1 && !e.sets[0].completed,
      ),
    ).toBe(true);
    expect(sessionStats(session)).toMatchObject({
      sets: 0,
      reps: 0,
      volume: 0,
    });
  });
  it("records two confirmed rounds as ordinary sets while excluding the next targets", () => {
    const { session } = fixture();
    logCircuitRound(session, undefined, 1000);
    logCircuitRound(session, undefined, 2000);
    expect(session.circuit?.round).toBe(3);
    expect(sessionStats(session)).toMatchObject({
      sets: 6,
      reps: 60,
      volume: 0,
    });
    expect(circuitRoundStats(session)).toEqual({
      completed: 2,
      partial: 0,
      reps: 60,
    });
    expect(
      session.exercises.every(
        (e) => e.sets.map((s) => s.circuitRound).join() === "1,2,3",
      ),
    ).toBe(true);
    expect(session.exercises.every((e) => !e.sets[2].completed)).toBe(true);
  });
  it("records a partial round and actual adjusted reps without completing untouched movements", () => {
    const { session } = fixture();
    logCircuitRound(session);
    session.exercises[0].sets[1].reps = 3;
    logCircuitRound(session, session.exercises[0].id);
    expect(sessionStats(session)).toMatchObject({ sets: 4, reps: 33 });
    expect(circuitRoundStats(session)).toEqual({
      completed: 1,
      partial: 1,
      reps: 33,
    });
    expect(session.circuit?.round).toBe(2);
    expect(session.exercises.slice(1).every((e) => !e.sets[1].completed)).toBe(
      true,
    );
  });
  it("does not double-record a movement before the rest of the round", () => {
    const { session } = fixture();
    logCircuitRound(session, session.exercises[0].id);
    expect(() => logCircuitRound(session, session.exercises[0].id)).toThrow(
      "no unfinished",
    );
    expect(sessionStats(session).reps).toBe(5);
  });
  it("validates every selected movement before changing any round records", () => {
    const { session } = fixture();
    session.exercises[2].sets[0].reps = 2.5;
    expect(() => logCircuitRound(session)).toThrow("whole repetition");
    expect(sessionStats(session).sets).toBe(0);
    expect(session.circuit?.round).toBe(1);
  });
  it("keeps target reps independent from a previous heavier or higher-rep workout", () => {
    const { data, template, session } = fixture();
    session.exercises[0].sets[0].reps = 99;
    session.exercises[0].sets[0].weightKg = 40;
    logCircuitRound(session);
    completeSession(data, session);
    const next = createSession(data, template);
    expect(next.exercises[0].sets[0]).toMatchObject({
      reps: 5,
      weightKg: 0,
      completed: false,
    });
  });
  it("persists a running clock, completed round, and unfinished actual fields across offline reload", () => {
    const { data, session } = fixture();
    session.circuit = resumeCircuit(session.circuit!, 1000);
    logCircuitRound(session, undefined, 2000);
    session.exercises[0].sets[1].reps = 3;
    const restored = validateBackup(
      decodePersistedData(encodePersistedData(data)),
    ).activeSession!;
    expect(circuitElapsedMs(restored.circuit!, 61000)).toBe(60000);
    expect(restored.exercises[0].sets[1].reps).toBe(3);
    expect(sessionStats(restored).reps).toBe(30);
  });
  it("pauses, resumes and resets only time, preserving recorded rounds", () => {
    const { session } = fixture();
    logCircuitRound(session);
    const paused = pauseCircuit(resumeCircuit(session.circuit!, 1000), 11000);
    expect(circuitElapsedMs(paused, 90000)).toBe(10000);
    const resumed = resumeCircuit(paused, 90000);
    expect(circuitElapsedMs(resumed, 95000)).toBe(15000);
    session.circuit = resetCircuitClock(resumed);
    expect(session.circuit).toMatchObject({
      elapsedMs: 0,
      startedAt: undefined,
      round: 2,
    });
    expect(sessionStats(session).reps).toBe(30);
  });
  it("reaching the time limit and overtime never fabricate reps or completed rounds", () => {
    const { session } = fixture();
    session.circuit = resumeCircuit(session.circuit!, 1000);
    expect(circuitElapsedMs(session.circuit, 1300000)).toBe(1299000);
    expect(sessionStats(session).sets).toBe(0);
    expect(circuitRoundStats(session).completed).toBe(0);
  });
  it("refuses to save an empty circuit so a timer-only session never creates workout history", () => {
    const { data, session } = fixture();
    session.circuit = finishCircuit(
      resumeCircuit(session.circuit!, 1000),
      1201000,
    );
    expect(() => completeSession(data, session)).toThrow("at least one");
    expect(data.sessions).toHaveLength(0);
    expect(data.activeSession?.id).toBe(session.id);
  });
  it("finishes with a stopped clock and preserves the incomplete final round honestly", () => {
    const { data, session } = fixture();
    session.circuit = resumeCircuit(session.circuit!, 1000);
    logCircuitRound(session);
    logCircuitRound(session, session.exercises[0].id);
    session.circuit = finishCircuit(session.circuit, 61000);
    expect(() => logCircuitRound(session)).toThrow("Resume");
    completeSession(data, session);
    expect(data.activeSession).toBeNull();
    expect(data.sessions.at(-1)?.circuit).toMatchObject({
      elapsedMs: 60000,
      startedAt: undefined,
    });
    expect(sessionStats(data.sessions.at(-1)!)).toMatchObject({
      sets: 4,
      reps: 35,
    });
  });
  it("reports active circuit time in history while excluding paused breaks and wall-clock gaps", () => {
    const { data, session } = fixture();
    session.startedAt = new Date(1000).toISOString();
    session.circuit = pauseCircuit(
      resumeCircuit(session.circuit!, 1000),
      11000,
    );
    session.circuit = finishCircuit(
      resumeCircuit(session.circuit, 61000),
      81000,
    );
    session.circuit.finishedAt = undefined;
    logCircuitRound(session);
    completeSession(data, session);
    expect(sessionStats(data.sessions.at(-1)!).durationSeconds).toBe(30);
  });
  it("keeps circuit clock and actual rounds when the source workout is permanently deleted", () => {
    const { data, session, template } = fixture();
    logCircuitRound(session);
    completeSession(data, session);
    deleteTemplate(data, template.id);
    const restored = validateBackup(data);
    expect(restored.templates.some((t) => t.id === template.id)).toBe(false);
    expect(restored.sessions.at(-1)?.circuit?.round).toBe(2);
    expect(sessionStats(restored.sessions.at(-1)!).reps).toBe(30);
  });
  it("allows equipment-skipped movements without reviving them in the next round", () => {
    const { data, session } = fixture();
    const adapted = adaptWorkoutSession(
      session,
      { [session.exercises[0].prescription.id]: { kind: "skip" } },
      data.exercises,
      data.equipment[0],
    );
    logCircuitRound(adapted);
    logCircuitRound(adapted);
    expect(adapted.exercises[0].sets).toHaveLength(1);
    expect(adapted.exercises[0].sets[0].skipped).toBe(true);
    expect(adapted.circuit?.round).toBe(3);
    expect(sessionStats(adapted)).toMatchObject({ sets: 4, reps: 50 });
    expect(circuitRoundStats(adapted).completed).toBe(2);
    expect(currentCircuitSet(adapted.exercises[0], 2)).toBeUndefined();
    expect(currentCircuitSet(adapted.exercises[0], 3)).toBeUndefined();
    expect(
      adapted.exercises
        .slice(1)
        .every((entry) => entry.sets.length === 3 && !entry.sets[2].completed),
    ).toBe(true);
  });
  it("rejects an invalid time limit and invalid target movement before session creation", () => {
    const { data, template } = fixture();
    template.circuit!.durationSeconds = 0;
    expect(() => createSession(data, template)).toThrow("time");
    template.circuit!.durationSeconds = 1200;
    template.exercises[0].repMin = 0;
    expect(validateCircuitTemplate(template, data.exercises)).toContain(
      "repetition",
    );
  });
  it("rejects corrupt circuit clock, future round markers, and non-integer markers in backups", () => {
    for (const corrupt of [
      (data: ReturnType<typeof fixture>["data"]) => {
        data.activeSession!.circuit!.elapsedMs = -1;
      },
      (data: ReturnType<typeof fixture>["data"]) => {
        data.activeSession!.exercises[0].sets[0].circuitRound = 2;
      },
      (data: ReturnType<typeof fixture>["data"]) => {
        data.activeSession!.exercises[0].sets[0].circuitRound = 1.5;
      },
      (data: ReturnType<typeof fixture>["data"]) => {
        const duplicate = structuredClone(
          data.activeSession!.exercises[0].sets[0],
        );
        duplicate.id = "duplicate-round-set";
        data.activeSession!.exercises[0].sets.push(duplicate);
      },
      (data: ReturnType<typeof fixture>["data"]) => {
        data.activeSession!.circuit!.finishedAt = 1000;
        data.activeSession!.circuit!.startedAt = 900;
      },
    ]) {
      const { data } = fixture();
      corrupt(data);
      expect(() => validateBackup(data)).toThrow();
    }
  });
  it("keeps ordinary grouped exercises as ordinary sets, without assuming timed circuit mode", () => {
    const { data, template } = fixture();
    delete template.circuit;
    template.exercises.forEach((p) => {
      p.group = "Circuit A";
      p.sets = 3;
    });
    const ordinary = createSession(data, template);
    expect(ordinary.circuit).toBeUndefined();
    expect(
      ordinary.exercises.every(
        (e) => e.sets.length === 3 && e.sets[0].circuitRound === undefined,
      ),
    ).toBe(true);
  });
  it("keeps clocks valid when historical backups contain a running timestamp", () => {
    const { data, session } = fixture();
    session.completedAt = new Date(21000).toISOString();
    session.circuit = resumeCircuit(session.circuit!, 1000);
    data.sessions.push(session);
    data.activeSession = null;
    const restored = validateBackup(data).sessions.at(-1)!;
    expect(restored.circuit).toMatchObject({
      elapsedMs: 20000,
      startedAt: undefined,
    });
  });
  it("retains immutable exercise and prescription snapshots if the live library changes", () => {
    const { data, session } = fixture();
    data.exercises.find((e) => e.id === "ex-pullups")!.name = "Edited pullups";
    expect(session.exercises[0].exercise.name).toBe("Pullups");
    expect(currentCircuitSet(session.exercises[0], 1)?.reps).toBe(5);
  });
  it("rejects unsafe history factories before persistence while leaving the recorded snapshot unchanged", () => {
    const { data, session } = fixture();
    logCircuitRound(session);
    completeSession(data, session);
    const saved = data.sessions[0];
    const before = structuredClone(saved);
    const replacement = data.exercises.find(
      (exercise) => exercise.id === "ex-plank",
    )!;
    for (const change of [
      (draft: typeof saved) => {
        draft.exercises[0].sets.push(makeSet(draft.exercises[0].prescription));
      },
      (draft: typeof saved) => {
        draft.exercises.push(makeSessionExercise(replacement));
      },
      (draft: typeof saved) => {
        draft.exercises[0] = makeSessionExercise(replacement, {
          ...draft.exercises[0].prescription,
          exerciseId: replacement.id,
        });
      },
      (draft: typeof saved) => {
        draft.exercises.push(
          makeSessionExercise(replacement, draft.exercises[0].prescription),
        );
      },
      (draft: typeof saved) => {
        draft.exercises[0].sets.push(
          makeSet(
            draft.exercises[0].prescription,
            draft.exercises[0].sets.at(-1),
          ),
        );
      },
    ]) {
      expect(() => correctCircuitHistory(saved, change)).toThrow(
        "recorded movements and rounds",
      );
      expect(saved).toEqual(before);
      const reloaded = validateBackup(
        decodePersistedData(encodePersistedData(data)),
      );
      expect(reloaded.sessions[0]).toEqual(before);
      expect(sessionStats(reloaded.sessions[0]).reps).toBe(30);
    }
  });
  it("persists actual history corrections and movement reordering without changing round IDs or snapshots", () => {
    const { data, session } = fixture();
    logCircuitRound(session);
    completeSession(data, session);
    const saved = data.sessions[0];
    const ids = saved.exercises.map((entry) => [
      entry.id,
      entry.sets.map((set) => [set.id, set.circuitRound]),
    ]);
    data.sessions[0] = correctCircuitHistory(saved, (draft) => {
      draft.exercises[0].sets[0].reps = 4;
      draft.exercises.reverse();
    });
    const restored = validateBackup(
      decodePersistedData(encodePersistedData(data)),
    ).sessions[0];
    expect(
      restored.exercises.map((entry) => [
        entry.id,
        entry.sets.map((set) => [set.id, set.circuitRound]),
      ]),
    ).toEqual([...ids].reverse());
    expect(sessionStats(restored).reps).toBe(29);
    expect(restored.exercises[2].exercise).toEqual(saved.exercises[0].exercise);
    expect(saved.exercises[0].sets[0].reps).toBe(5);
  });
  it("removing a recorded movement keeps the round slot and yields a partial round after reload", () => {
    const { data, session } = fixture();
    logCircuitRound(session);
    completeSession(data, session);
    const saved = data.sessions[0];
    const pullup = saved.exercises[0];
    data.sessions[0] = correctCircuitHistory(saved, (draft) =>
      removeCircuitRecord(draft, pullup.id, pullup.sets[0].id),
    );
    const restored = validateBackup(
      decodePersistedData(encodePersistedData(data)),
    ).sessions[0];
    expect(restored.exercises[0].sets[0]).toMatchObject({
      id: pullup.sets[0].id,
      circuitRound: 1,
      completed: false,
      skipped: false,
    });
    expect(sessionStats(restored)).toMatchObject({ sets: 2, reps: 25 });
    expect(circuitRoundStats(restored)).toEqual({
      completed: 0,
      partial: 1,
      reps: 25,
    });
  });
  it("normalizes fractional and negative actual fields before both pending and recorded values reach local storage", () => {
    const { data, session } = fixture();
    for (const patch of [
      { reps: 2.5, weightKg: -3, durationSeconds: -5, distanceKm: -1 },
      {
        reps: Number.NaN,
        weightKg: Number.POSITIVE_INFINITY,
        durationSeconds: Number.NEGATIVE_INFINITY,
        distanceKm: Number.NaN,
      },
    ]) {
      data.activeSession = session;
      Object.assign(
        session.exercises[0].sets[0],
        normalizeCircuitSetPatch(patch),
      );
      let restored = validateBackup(
        decodePersistedData(encodePersistedData(data)),
      ).activeSession!;
      expect(restored.exercises[0].sets[0]).toMatchObject({
        reps: Number.isFinite(patch.reps) ? 2 : 0,
        weightKg: 0,
        durationSeconds: 0,
        distanceKm: 0,
      });
      restored.exercises[0].sets[0].completed = true;
      Object.assign(
        restored.exercises[0].sets[0],
        normalizeCircuitSetPatch(patch),
      );
      data.activeSession = restored;
      restored = validateBackup(
        decodePersistedData(encodePersistedData(data)),
      ).activeSession!;
      expect(restored.exercises[0].sets[0].completed).toBe(true);
    }
  });
  it("removes all actual work for a movement without losing required round slots or turning partial rounds into full rounds", () => {
    const { data, session } = fixture();
    logCircuitRound(session);
    logCircuitRound(session);
    completeSession(data, session);
    const saved = data.sessions[0];
    expect(() =>
      correctCircuitHistory(saved, (draft) => {
        draft.exercises.shift();
      }),
    ).toThrow("recorded movements and rounds");
    data.sessions[0] = correctCircuitHistory(saved, (draft) => {
      draft.exercises[0].sets.forEach((set) =>
        removeCircuitRecord(draft, draft.exercises[0].id, set.id),
      );
    });
    const restored = validateBackup(
      decodePersistedData(encodePersistedData(data)),
    ).sessions[0];
    expect(
      restored.exercises[0].sets.map((set) => [set.id, set.circuitRound]),
    ).toEqual(saved.exercises[0].sets.map((set) => [set.id, set.circuitRound]));
    expect(circuitRoundStats(restored)).toEqual({
      completed: 0,
      partial: 2,
      reps: 50,
    });
    expect(sessionStats(restored)).toMatchObject({ sets: 4, reps: 50 });
  });
});
