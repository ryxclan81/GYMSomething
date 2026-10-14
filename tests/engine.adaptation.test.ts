import { describe, expect, it } from "vitest";
import { starterExercises } from "../src/data/exercises";
import { starterPresetData as defaultData } from "../src/data/defaults";
import {
  createSession,
  makeSessionExercise,
  makeSet,
} from "../src/domain/session";
import { prescription } from "../src/domain/helpers";
import {
  adaptWorkoutSession,
  equipmentCompatibility,
  sessionStats,
  substitutions,
  substitutionDetails,
} from "../src/domain/engine";
import type { SessionAdaptation } from "../src/domain/engine";
import type { EquipmentProfile } from "../src/domain/types";

const item = (id: string) =>
  starterExercises.find((exercise) => exercise.id === id)!;
const bench = item("ex-barbell-bench-press-medium-grip");
const pushup = item("ex-pushups");
const pullup = item("ex-pullups");
const plank = item("ex-plank");
const bodyOnly: EquipmentProfile = {
  id: "body",
  name: "Bodyweight / Travel",
  items: ["No equipment"],
  canIncline: false,
  notes: "",
};
const home: EquipmentProfile = {
  id: "home",
  name: "Home",
  items: ["Dumbbells", "Exercise mat"],
  maxDumbbellKg: 25,
  canIncline: false,
  notes: "",
};

function fixture() {
  const data = defaultData();
  const template = structuredClone(data.templates[0]);
  template.exercises = [bench, pullup, plank].map((exercise) =>
    prescription(exercise),
  );
  template.exercises[0].weightKg = 60;
  template.exercises[0].rir = 2;
  template.exercises[0].rule = {
    ...data.profile.progression,
    strategy: "percentage",
  };
  const session = createSession(data, template);
  session.focusedExerciseId = session.exercises[0].id;
  const choices: Record<string, SessionAdaptation> = {
    [session.exercises[0].prescription.id]: {
      kind: "substitute",
      exerciseId: pushup.id,
    },
    [session.exercises[1].prescription.id]: { kind: "skip" },
  };
  return { data, template, session, choices };
}

describe("Equipment adaptation for home and bodyweight training", () => {
  it("offers real no-equipment pushing choices and only available equipment", () => {
    const matches = substitutions(bench, starterExercises, home);
    expect(matches.some((exercise) => exercise.id === pushup.id)).toBe(true);
    expect(
      matches.every(
        (exercise) => equipmentCompatibility(exercise, home).compatible,
      ),
    ).toBe(true);
    expect(
      matches.every((exercise) => exercise.difficulty !== "Advanced"),
    ).toBe(true);
    expect(matches.every((exercise) => exercise.category !== "Mobility")).toBe(
      true,
    );
  });
  it("prefers the same movement pattern over a merely general bodyweight option", () => {
    const isolated = {
      ...bench,
      id: "unrelated",
      name: "Unrelated arm drill",
      primary: ["Biceps"],
      secondary: [],
      pattern: "Elbow flexion",
      equipment: [],
      load: "none" as const,
      measurement: "bodyweight" as const,
    };
    const matches = substitutions(bench, [isolated, pushup], bodyOnly);
    expect(matches[0].id).toBe(pushup.id);
    expect(substitutionDetails(bench, pushup).kind).toBe("movement");
    expect(substitutionDetails(bench, isolated)).toMatchObject({
      kind: "general",
    });
    expect(substitutionDetails(bench, isolated).reason).toContain(
      "not an equivalent",
    );
  });
  it("finds a hip-focused bodyweight alternative through secondary muscles", () => {
    const deadlift = item("ex-barbell-deadlift");
    const bridge = item("ex-single-leg-glute-bridge");
    const matches = substitutions(deadlift, [bridge, pushup], bodyOnly);
    expect(matches[0].id).toBe(bridge.id);
  });
  it("can offer a broader upper-body option when no supported pulling movement exists", () => {
    const matches = substitutions(pullup, [pullup, pushup], bodyOnly);
    expect(equipmentCompatibility(pullup, bodyOnly).compatible).toBe(false);
    expect(matches).toEqual([pushup]);
    expect(substitutionDetails(pullup, pushup).kind).toBe("general");
    expect(substitutionDetails(pullup, pushup).reason).toContain(
      "changes the movement",
    );
  });
  it("never invents support, overrides avoid lists or returns archived movements", () => {
    const unavailable = {
      ...pushup,
      id: "requires-bar",
      equipment: ["Pull-up bar"],
    };
    const archived = { ...pushup, id: "archived", archived: true };
    const advanced = {
      ...pushup,
      id: "advanced",
      difficulty: "Advanced" as const,
    };
    expect(
      substitutions(
        bench,
        [pushup, unavailable, archived, advanced],
        bodyOnly,
        [pushup.id],
      ),
    ).toEqual([]);
    expect(
      substitutions(bench, [item("ex-dumbbell-bench-press")], {
        ...home,
        maxDumbbellKg: 0,
      }),
    ).toEqual([]);
  });
  it("keeps cardio alternatives within cardio and describes an outdoor requirement", () => {
    const treadmill = item("ex-running-treadmill");
    const trail = item("ex-trail-running-walking");
    expect(substitutions(treadmill, [pushup, trail], bodyOnly)).toEqual([
      trail,
    ]);
    expect(substitutionDetails(treadmill, trail).reason).toContain(
      "outdoor route",
    );
  });

  it("substitutes and skips in a clone while preserving original identities and focus", () => {
    const { session, choices, template } = fixture();
    const before = structuredClone(session),
      planBefore = structuredClone(template);
    const result = adaptWorkoutSession(
      session,
      choices,
      starterExercises,
      bodyOnly,
    );
    expect(session).toEqual(before);
    expect(template).toEqual(planBefore);
    expect(result.exercises.map((exercise) => exercise.id)).toEqual(
      session.exercises.map((exercise) => exercise.id),
    );
    expect(result.focusedExerciseId).toBe(session.focusedExerciseId);
    expect(result.exercises[0].originalExerciseId).toBe(bench.id);
    expect(result.exercises[0].exerciseId).toBe(pushup.id);
    expect(result.exercises[0].exercise.id).toBe(pushup.id);
    expect(result.exercises[0].prescription).toMatchObject({
      exerciseId: pushup.id,
      weightKg: 0,
      rir: undefined,
      rule: undefined,
      durationSeconds: 0,
      distanceKm: 0,
    });
    expect(result.exercises[0].sets.map((set) => set.id)).toEqual(
      session.exercises[0].sets.map((set) => set.id),
    );
    expect(
      result.exercises[0].sets.every(
        (set) => !set.completed && set.weightKg === 0 && set.rir === undefined,
      ),
    ).toBe(true);
    expect(result.exercises[1].exerciseId).toBe(pullup.id);
    expect(
      result.exercises[1].sets.every((set) => set.skipped && !set.completed),
    ).toBe(true);
    expect(result.equipmentId).toBe(bodyOnly.id);
  });
  it("permits all unavailable exercises to be explicitly skipped with zero completed work", () => {
    const { session } = fixture();
    const choices = Object.fromEntries(
      session.exercises.map((exercise) => [
        exercise.prescription.id,
        { kind: "skip" } as const,
      ]),
    );
    const result = adaptWorkoutSession(
      session,
      choices,
      starterExercises,
      bodyOnly,
    );
    expect(result.exercises).toHaveLength(3);
    expect(
      result.exercises.every((exercise) =>
        exercise.sets.every((set) => set.skipped),
      ),
    ).toBe(true);
    expect(sessionStats(result).sets).toBe(0);
    expect(session.exercises[0].sets[0].skipped).toBe(false);
  });
  it("requires a clear decision for every unavailable item and rejects stale keys", () => {
    const { session } = fixture();
    expect(() =>
      adaptWorkoutSession(session, {}, starterExercises, bodyOnly),
    ).toThrow(/substitute or skip/);
    expect(() =>
      adaptWorkoutSession(
        session,
        { missing: { kind: "skip" } },
        starterExercises,
        bodyOnly,
      ),
    ).toThrow(/outside this session/);
  });
  it("rejects unavailable, archived or avoided replacements before returning a session", () => {
    const { session, choices } = fixture();
    const key = session.exercises[0].prescription.id;
    expect(() =>
      adaptWorkoutSession(
        session,
        { ...choices, [key]: { kind: "substitute", exerciseId: "missing" } },
        starterExercises,
        bodyOnly,
      ),
    ).toThrow(/available exercise/);
    expect(() =>
      adaptWorkoutSession(
        session,
        { ...choices, [key]: { kind: "substitute", exerciseId: pullup.id } },
        starterExercises,
        bodyOnly,
      ),
    ).toThrow(/supported by this equipment/);
    expect(() =>
      adaptWorkoutSession(session, choices, starterExercises, bodyOnly, [
        pushup.id,
      ]),
    ).toThrow(/avoid/);
    expect(() =>
      adaptWorkoutSession(
        session,
        choices,
        starterExercises.map((exercise) =>
          exercise.id === pushup.id
            ? { ...exercise, archived: true }
            : exercise,
        ),
        bodyOnly,
      ),
    ).toThrow(/archived/);
  });
  it("never relabels completed actual sets but allows remaining work to be skipped", () => {
    const { session, choices } = fixture();
    session.exercises[0].sets[0].completed = true;
    expect(() =>
      adaptWorkoutSession(session, choices, starterExercises, bodyOnly),
    ).toThrow(/Completed sets/);
    const result = adaptWorkoutSession(
      session,
      { ...choices, [session.exercises[0].prescription.id]: { kind: "skip" } },
      starterExercises,
      bodyOnly,
    );
    expect(result.exercises[0].sets[0]).toEqual(session.exercises[0].sets[0]);
    expect(result.exercises[0].sets.slice(1).every((set) => set.skipped)).toBe(
      true,
    );
    expect(sessionStats(result).sets).toBe(1);
    expect(sessionStats(result).volume).toBe(
      60 * session.exercises[0].sets[0].reps,
    );
  });
  it("uses suitable timed defaults when a different modality is explicitly selected", () => {
    const { session, choices } = fixture();
    const result = adaptWorkoutSession(
      session,
      {
        ...choices,
        [session.exercises[0].prescription.id]: {
          kind: "substitute",
          exerciseId: plank.id,
        },
      },
      starterExercises,
      bodyOnly,
    );
    expect(result.exercises[0].prescription).toMatchObject({
      repMin: 0,
      repMax: 0,
      durationSeconds: 30,
      distanceKm: 0,
      weightKg: 0,
    });
    expect(
      result.exercises[0].sets.every(
        (set) =>
          set.type === "timed" && set.reps === 0 && set.durationSeconds === 30,
      ),
    ).toBe(true);
  });
  it("rejects adaptation of completed session history", () => {
    const { session, choices } = fixture();
    session.completedAt = new Date().toISOString();
    expect(() =>
      adaptWorkoutSession(session, choices, starterExercises, bodyOnly),
    ).toThrow(/completed records in history/);
  });
});

describe("New timed set defaults preserve previous categories", () => {
  it("starts new duration and cardio entries as timed, and resistance as working", () => {
    expect(
      makeSessionExercise(plank).sets.every((set) => set.type === "timed"),
    ).toBe(true);
    expect(
      makeSessionExercise(item("ex-running-treadmill")).sets.every(
        (set) => set.type === "timed",
      ),
    ).toBe(true);
    expect(
      makeSessionExercise(pushup).sets.every((set) => set.type === "working"),
    ).toBe(true);
  });
  it("preserves custom and warm-up categories in explicitly supplied previous sets", () => {
    const p = prescription(plank);
    const previous = makeSessionExercise(plank);
    previous.sets[0].type = "custom";
    previous.sets[0].completed = true;
    expect(makeSessionExercise(plank, p, previous).sets[0].type).toBe("custom");
    expect(previous.sets[0].type).toBe("custom");
    expect(makeSet(p, { ...previous.sets[0], type: "warmup" }).type).toBe(
      "warmup",
    );
  });
});
