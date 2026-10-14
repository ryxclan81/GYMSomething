import { afterEach, describe, expect, it, vi } from "vitest";
import {
  achievements,
  equipmentCompatibility,
  estimated1RM,
  evaluateProgression,
  fromKg,
  goalProgress,
  goalValue,
  muscleVolume,
  personalRecords,
  sessionStats,
  strengthTier,
  substitutions,
  toKg,
  weeklyStreak,
  volumeLoad,
} from "../src/domain/engine";
import { starterPresetData as defaultData, defaultRule } from "../src/data/defaults";
import { starterExercises } from "../src/data/exercises";
import type {
  Exercise,
  Goal,
  Prescription,
  Session,
  WorkoutSet,
} from "../src/domain/types";

const exercise = starterExercises.find(
  (e) => e.id === "ex-barbell-bench-press-medium-grip",
)!;
const bodyweight = starterExercises.find((e) => e.id === "ex-pushups")!;
const cardio = starterExercises.find((e) => e.id === "ex-running-treadmill")!;
const dumbbells = starterExercises.find(
  (e) => e.id === "ex-dumbbell-bench-press",
)!;
const prescription: Prescription = {
  id: "p",
  exerciseId: exercise.id,
  sets: 3,
  repMin: 8,
  repMax: 12,
  weightKg: 60,
  restSeconds: 90,
  durationSeconds: 30,
  distanceKm: 3,
  group: "",
  notes: "",
};
const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: crypto.randomUUID(),
  weightKg: 60,
  reps: 12,
  durationSeconds: 0,
  distanceKm: 0,
  type: "working",
  completed: true,
  skipped: false,
  ...overrides,
});
const session = (
  date = "2026-10-09T18:00:00",
  sets = [set(), set(), set()],
  item = exercise,
  overrides: Partial<Session> = {},
): Session => ({
  id: crypto.randomUUID(),
  name: "Test workout",
  startedAt: date,
  completedAt: new Date(new Date(date).getTime() + 3600000).toISOString(),
  equipmentId: "gym",
  notes: "",
  exercises: [
    {
      id: "entry",
      exerciseId: item.id,
      exercise: item,
      prescription: { ...prescription, exerciseId: item.id },
      sets,
      notes: "",
    },
  ],
  ...overrides,
});
const successfulSessions = () => [
  session("2026-10-01T18:00:00"),
  session("2026-10-09T18:00:00"),
];
const now = new Date("2026-10-10T20:00:00");
const rule = { ...defaultRule, minDays: 0 };
const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal",
  name: "Goal",
  type: "weight",
  exerciseId: exercise.id,
  start: 0,
  current: 0,
  target: 100,
  unit: "kg",
  notes: "",
  history: [],
  ...overrides,
});

afterEach(() => vi.useRealTimers());

describe("load conventions and working sets", () => {
  it("converts pounds exactly and round-trips without rounding storage", () => {
    expect(toKg(100, "lb")).toBeCloseTo(45.359237, 8);
    expect(fromKg(toKg(135, "lb"), "lb")).toBeCloseTo(135, 10);
    expect(toKg(25, "kg")).toBe(25);
  });
  it("uses Epley for reasonable resistance sets and honors a measured single", () => {
    expect(estimated1RM(set({ reps: 5, weightKg: 100 }), exercise)).toBeCloseTo(
      116.6666667,
    );
    expect(estimated1RM(set({ reps: 1, weightKg: 100 }), exercise)).toBe(100);
    expect(
      estimated1RM(set({ reps: 10, weightKg: 20 }), dumbbells),
    ).toBeCloseTo(26.6666667);
  });
  it.each([
    set({ reps: 11 }),
    set({ reps: 0 }),
    set({ reps: 2.5 }),
    set({ weightKg: 0 }),
    set({ weightKg: NaN }),
    set({ type: "warmup" }),
    set({ skipped: true }),
    set({ completed: false }),
  ])("rejects an ineligible e1rm set", (value) =>
    expect(estimated1RM(value, exercise)).toBeNull(),
  );
  it("does not estimate cardio, bodyweight, holds or assisted performance", () => {
    for (const item of [
      cardio,
      bodyweight,
      { ...exercise, measurement: "duration" as const },
      {
        ...exercise,
        measurement: "assisted" as const,
        load: "assistance" as const,
      },
    ])
      expect(estimated1RM(set(), item)).toBeNull();
  });
  it("counts external load and two simultaneous dumbbells, but keeps unilateral volume separate", () => {
    expect(volumeLoad(set({ weightKg: 60, reps: 10 }), exercise)).toBe(600);
    expect(volumeLoad(set({ weightKg: 20, reps: 10 }), dumbbells)).toBe(400);
    const row = starterExercises.find(
      (e) => e.id === "ex-one-arm-dumbbell-row",
    )!;
    expect(volumeLoad(set({ weightKg: 20, reps: 10 }), row)).toBe(200);
    expect(volumeLoad(set(), bodyweight)).toBe(0);
    expect(volumeLoad(set(), { ...bodyweight, load: "added" })).toBe(720);
    expect(
      volumeLoad(set(), {
        ...bodyweight,
        measurement: "assisted",
        load: "assistance",
      }),
    ).toBe(0);
  });
  it("ignores warmups, skipped, unfinished and empty sets in session totals", () => {
    const result = sessionStats(
      session("2026-10-09T18:00:00", [
        set({ reps: 10 }),
        set({ type: "warmup" }),
        set({ skipped: true }),
        set({ completed: false }),
        set({ reps: 0 }),
      ]),
    );
    expect(result).toEqual({
      sets: 1,
      reps: 10,
      volume: 600,
      durationSeconds: 3600,
    });
  });
  it("keeps timed sets meaningful and guards invalid timestamps", () => {
    expect(
      sessionStats(
        session(
          "2026-10-09T18:00:00",
          [set({ reps: 0, weightKg: 0, durationSeconds: 30 })],
          { ...bodyweight, measurement: "duration" },
        ),
      ).sets,
    ).toBe(1);
    expect(
      sessionStats(
        session("2026-10-09T18:00:00", [set()], exercise, { startedAt: "bad" }),
      ).durationSeconds,
    ).toBe(0);
  });
});

describe("muscle analytics", () => {
  it("counts direct/indirect contributions and distinct training days without double counting duplicates", () => {
    const item = {
      ...exercise,
      primary: ["Chest", "Chest"],
      secondary: ["Chest", "Triceps", "Triceps"],
    };
    const a = session(
      "2026-10-07T12:00:00",
      [set(), set(), set({ type: "warmup" })],
      item,
    );
    const b = session("2026-10-07T18:00:00", [set()], item);
    const rows = muscleVolume(
      [a, a, b, session("2026-09-01T12:00:00", [set()], item)],
      [],
      "2026-10-05",
      0.5,
    );
    expect(rows.find((row) => row.muscle === "Chest")).toEqual({
      muscle: "Chest",
      direct: 3,
      indirect: 0,
      frequency: 1,
    });
    expect(rows.find((row) => row.muscle === "Triceps")).toEqual({
      muscle: "Triceps",
      direct: 0,
      indirect: 1.5,
      frequency: 1,
    });
  });
  it("uses saved muscle snapshots and excludes cardio and mobility", () => {
    const saved = session("2026-10-07T12:00:00", [set()], {
      ...exercise,
      primary: ["Chest"],
      secondary: [],
    });
    const rows = muscleVolume(
      [
        saved,
        session("2026-10-08T12:00:00", [set()], cardio),
        session("2026-10-08T12:00:00", [set()], {
          ...exercise,
          category: "Mobility",
        }),
      ],
      [{ ...exercise, primary: ["Biceps"] }],
      "2026-10-05",
      0,
    );
    expect(rows).toEqual([
      { muscle: "Chest", direct: 1, indirect: 0, frequency: 1 },
    ]);
  });
});

describe("equipment compatibility and substitutions", () => {
  const profile = {
    id: "home",
    name: "Home",
    items: ["Adjustable dumbbells", "Adjustable bench"],
    canIncline: false,
    maxDumbbellKg: 25,
    notes: "",
  };
  it("supports inventory aliases and bench capability constraints", () => {
    expect(equipmentCompatibility(dumbbells, profile).compatible).toBe(true);
    expect(
      equipmentCompatibility(
        { ...dumbbells, equipment: ["Adjustable bench"] },
        profile,
      ),
    ).toEqual({
      compatible: false,
      reasons: ["An incline-capable bench is required."],
    });
    expect(equipmentCompatibility(exercise, profile).reasons).toContain(
      "Requires Barbell.",
    );
    expect(
      equipmentCompatibility(bodyweight, { ...profile, items: [] }).compatible,
    ).toBe(true);
  });
  it("requires actual pull-up support even for a bodyweight movement", () => {
    const pullup = starterExercises.find((e) => e.id === "ex-pullups")!;
    expect(pullup.equipment).toContain("Pull-up bar");
    expect(
      equipmentCompatibility(pullup, { ...profile, items: [] }).compatible,
    ).toBe(false);
  });
  it("checks a prescribed per-hand weight against inventory limits without assuming load transfers", () => {
    expect(equipmentCompatibility(dumbbells, profile, 25).compatible).toBe(
      true,
    );
    expect(equipmentCompatibility(dumbbells, profile, 30)).toEqual({
      compatible: false,
      reasons: ["Target 30 kg per hand exceeds the 25 kg dumbbell limit."],
    });
    expect(equipmentCompatibility(dumbbells, profile).compatible).toBe(true);
  });
  it("finds equipment-compatible alternatives without mutating exercises or transferring loading", () => {
    const matches = substitutions(exercise, starterExercises, profile);
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every(
        (item) =>
          item.id !== exercise.id &&
          equipmentCompatibility(item, profile).compatible,
      ),
    ).toBe(true);
    expect(matches.some((item) => item.id === dumbbells.id)).toBe(true);
  });
});

describe("deterministic progression", () => {
  it("requires consecutive successful sessions and configurable set thresholds", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [successfulSessions()[0]],
        rule,
        now,
      ),
    ).toBeNull();
    const suggestion = evaluateProgression(
      exercise,
      prescription,
      successfulSessions(),
      rule,
      now,
    )!;
    expect(suggestion).toMatchObject({
      field: "weightKg",
      current: 60,
      proposed: 62.5,
      status: "pending",
      strategy: "double",
    });
    expect(suggestion.reason).toContain("3 sets across 2");
    expect(prescription.weightKg).toBe(60);
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [
          ...successfulSessions(),
          session("2026-10-10T12:00:00", [set({ reps: 10 }), set(), set()]),
        ],
        rule,
        now,
      ),
    ).toBeNull();
  });
  it("learns a consistent logged baseline when a starter prescription has no planned load", () => {
    const p = { ...prescription, weightKg: 0 };
    const suggestion = evaluateProgression(
      exercise,
      p,
      successfulSessions(),
      rule,
      now,
    )!;
    expect(suggestion).toMatchObject({
      current: 60,
      proposed: 62.5,
      field: "weightKg",
    });
    expect(suggestion.reason).toContain("No planned load was set");
    expect(p.weightKg).toBe(0);
  });
  it("excludes warmups and mismatched load, and fails thresholds above planned sets", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [session(undefined, [set(), set(), set({ type: "warmup" })])],
        { ...rule, sessions: 1 },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [session(undefined, [set(), set(), set({ weightKg: 65 })])],
        { ...rule, sessions: 1 },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, successfulSets: 4 },
        now,
      ),
    ).toBeNull();
  });
  it("does not combine exercise substitutions, equipment environments or conventions", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [
          session("2026-10-01T18:00:00"),
          session(undefined, undefined, exercise, { equipmentId: "home" }),
        ],
        rule,
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [
          session("2026-10-01T18:00:00"),
          session(undefined, undefined, { ...exercise, load: "per-hand" }),
        ],
        rule,
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        [
          session("2026-10-01T18:00:00"),
          session(undefined, undefined, dumbbells),
        ],
        rule,
        now,
      ),
    ).toBeNull();
  });
  it("enforces elapsed time at the current load", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, minDays: 14 },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, minDays: 7 },
        now,
      )?.field,
    ).toBe("weightKg");
  });
  it("does not require effort by default but configured missing effort prevents an increase", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, minRir: 2 },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, maxRpe: 8 },
        now,
      ),
    ).toBeNull();
    const sessions = [
      session("2026-10-01T18:00:00", [
        set({ rir: 2, rpe: 8 }),
        set({ rir: 2, rpe: 8 }),
        set({ rir: 3, rpe: 7 }),
      ]),
      session(undefined, [
        set({ rir: 2, rpe: 8 }),
        set({ rir: 2, rpe: 8 }),
        set({ rir: 3, rpe: 7 }),
      ]),
    ];
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions,
        { ...rule, minRir: 2, maxRpe: 8 },
        now,
      )?.proposed,
    ).toBe(62.5);
  });
  it("progresses reps within the configured ceiling, then waits", () => {
    const p = { ...prescription, repMax: 10 };
    expect(
      evaluateProgression(
        exercise,
        p,
        [
          session(undefined, [
            set({ reps: 10 }),
            set({ reps: 10 }),
            set({ reps: 10 }),
          ]),
        ],
        { ...rule, strategy: "reps", sessions: 1 },
        now,
      ),
    ).toMatchObject({ field: "repMax", proposed: 11 });
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "reps" },
        now,
      ),
    ).toBeNull();
  });
  it("linear load progression uses the minimum target and manual strategy is quiet", () => {
    const sessions = [
      session(undefined, [
        set({ reps: 8 }),
        set({ reps: 8 }),
        set({ reps: 8 }),
      ]),
    ];
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions,
        { ...rule, strategy: "linear", sessions: 1 },
        now,
      )?.proposed,
    ).toBe(62.5);
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "manual" },
        now,
      ),
    ).toBeNull();
  });
  it("RIR/RPE strategies require actual effort measurements", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "rir" },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "rpe" },
        now,
      ),
    ).toBeNull();
    const measured = [
      session(undefined, [
        set({ rir: 3, rpe: 7 }),
        set({ rir: 3, rpe: 7 }),
        set({ rir: 3, rpe: 7 }),
      ]),
    ];
    expect(
      evaluateProgression(
        exercise,
        prescription,
        measured,
        { ...rule, strategy: "rir", sessions: 1, minRir: 2 },
        now,
      )?.field,
    ).toBe("weightKg");
    expect(
      evaluateProgression(
        exercise,
        prescription,
        measured,
        { ...rule, strategy: "rpe", sessions: 1, maxRpe: 8 },
        now,
      )?.field,
    ).toBe("weightKg");
  });
  it("set progression is one optional set and caps high volume with a review", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "volume" },
        now,
      ),
    ).toMatchObject({ field: "sets", proposed: 4, confidence: "low" });
    expect(
      evaluateProgression(
        exercise,
        { ...prescription, sets: 10 },
        successfulSessions(),
        { ...rule, strategy: "volume" },
        now,
      )?.field,
    ).toBe("review");
  });
  it("percentage strategy uses eligible e1rm data, rejects ambiguous defaults and high-rep sets", () => {
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "percentage" },
        now,
      ),
    ).toBeNull();
    const sessions = [
      session(undefined, [
        set({ reps: 8 }),
        set({ reps: 8 }),
        set({ reps: 8 }),
      ]),
    ];
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions,
        { ...rule, strategy: "percentage", sessions: 1, percentage: 75 },
        now,
      )?.proposed,
    ).toBe(57);
  });
  it("cardio duration/distance progression requires achieved targets and conservatively bounded increments", () => {
    const sessions = [
      session(
        undefined,
        [set({ reps: 0, weightKg: 0, durationSeconds: 1200, distanceKm: 3 })],
        cardio,
      ),
    ];
    const p = {
      ...prescription,
      exerciseId: cardio.id,
      sets: 1,
      durationSeconds: 1200,
    };
    expect(
      evaluateProgression(
        cardio,
        p,
        sessions,
        { ...rule, strategy: "duration", sessions: 1, successfulSets: 1 },
        now,
      ),
    ).toMatchObject({ field: "durationSeconds", proposed: 1260 });
    expect(
      evaluateProgression(
        cardio,
        p,
        sessions,
        { ...rule, strategy: "distance", sessions: 1, successfulSets: 1 },
        now,
      ),
    ).toMatchObject({ field: "distanceKm", proposed: 3.15 });
    expect(
      evaluateProgression(
        cardio,
        p,
        sessions,
        {
          ...rule,
          strategy: "distance",
          sessions: 1,
          successfulSets: 1,
          percentage: 50,
        },
        now,
      ),
    ).toBeNull();
  });
  it("reduces assistance rather than increasing it", () => {
    const assisted: Exercise = {
      ...bodyweight,
      measurement: "assisted",
      load: "assistance",
    };
    const p = { ...prescription, exerciseId: assisted.id, weightKg: 20 };
    const sessions = [
      session(
        undefined,
        [set({ weightKg: 20 }), set({ weightKg: 20 }), set({ weightKg: 20 })],
        assisted,
      ),
    ];
    expect(
      evaluateProgression(assisted, p, sessions, { ...rule, sessions: 1 }, now),
    ).toMatchObject({ field: "weightKg", proposed: 17.5 });
    expect(
      evaluateProgression(
        assisted,
        p,
        sessions,
        { ...rule, sessions: 1, strategy: "rir" },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateProgression(
        assisted,
        p,
        sessions,
        { ...rule, sessions: 1, strategy: "rpe" },
        now,
      ),
    ).toBeNull();
  });
  it("skill and elapsed-time rules produce reviews without invented loading", () => {
    expect(
      evaluateProgression(
        bodyweight,
        { ...prescription, exerciseId: bodyweight.id },
        [session(undefined, undefined, bodyweight)],
        { ...rule, strategy: "skill", sessions: 1 },
        now,
      )?.field,
    ).toBe("review");
    const sessions = [
      session("2026-09-01T18:00:00"),
      session("2026-10-09T18:00:00"),
    ];
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions,
        { ...rule, strategy: "review" },
        now,
      )?.field,
    ).toBe("review");
    expect(
      evaluateProgression(
        exercise,
        prescription,
        successfulSessions(),
        { ...rule, strategy: "review" },
        now,
      ),
    ).toBeNull();
  });
  it("uses multiple sessions before a plateau review and ignores one weak session", () => {
    const sessions = [1, 3, 5, 9].map((day) =>
      session(`2026-10-${String(day).padStart(2, "0")}T18:00:00`, [
        set({ reps: 9 }),
        set({ reps: 8 }),
        set({ reps: 8 }),
      ]),
    );
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions,
        { ...rule, plateauSessions: 4 },
        now,
      )?.field,
    ).toBe("review");
    expect(
      evaluateProgression(
        exercise,
        prescription,
        sessions.slice(-1),
        { ...rule, plateauSessions: 4 },
        now,
      ),
    ).toBeNull();
  });
});

describe("goals, records and consistency", () => {
  it("calculates weight, estimated maximum and total-load-relative goals in explicit units", () => {
    const data = defaultData();
    data.profile.bodyweightKg = 80;
    data.sessions = [session(undefined, [set({ weightKg: 80, reps: 5 })])];
    expect(goalValue(goal(), data)).toBe(80);
    expect(goalValue(goal({ unit: "lb" }), data)).toBeCloseTo(fromKg(80, "lb"));
    expect(goalValue(goal({ type: "e1rm" }), data)).toBeCloseTo(93.33333333);
    expect(
      goalValue(goal({ type: "relative", unit: "× BW" }), data),
    ).toBeCloseTo(1.16666667);
    data.profile.bodyweightKg = undefined;
    expect(goalValue(goal({ type: "relative" }), data)).toBe(0);
  });
  it("handles descending goals, completion, zero range and clamping", () => {
    expect(goalProgress(goal({ start: 100, current: 95, target: 90 }))).toBe(
      0.5,
    );
    expect(goalProgress(goal({ start: 100, current: 89, target: 90 }))).toBe(1);
    expect(goalProgress(goal({ start: 0, current: -5, target: 10 }))).toBe(0);
    expect(goalProgress(goal({ start: 10, current: 10, target: 10 }))).toBe(1);
  });
  it("calculates cardio distance, fastest pace and hold goals without cross-modality records", () => {
    const data = defaultData();
    data.sessions = [
      session(
        undefined,
        [set({ reps: 0, weightKg: 0, durationSeconds: 1800, distanceKm: 5 })],
        cardio,
      ),
    ];
    expect(
      goalValue(
        goal({ type: "distance", exerciseId: cardio.id, unit: "km" }),
        data,
      ),
    ).toBe(5);
    expect(
      goalValue(
        goal({ type: "pace", exerciseId: cardio.id, unit: "min/km" }),
        data,
      ),
    ).toBe(6);
    expect(
      goalValue(
        goal({ type: "duration", exerciseId: cardio.id, unit: "min" }),
        data,
      ),
    ).toBe(30);
    const records = personalRecords(data.sessions);
    expect(records.some((record) => record.type === "Estimated 1RM")).toBe(
      false,
    );
    expect(
      records.find((record) => record.type === "Fastest pace")?.value,
    ).toBe(6);
  });
  it("weekly frequency and volume goals exclude historical weeks and double completions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const data = defaultData(),
      a = session("2026-10-07T12:00:00");
    data.sessions = [a, a, session("2026-09-01T12:00:00")];
    expect(goalValue(goal({ type: "frequency" }), data)).toBe(1);
    expect(goalValue(goal({ type: "volume" }), data)).toBe(3);
    expect(goalValue(goal({ type: "volume", muscle: "Chest" }), data)).toBe(3);
  });
  it("counts calendar weeks, gives the current week time, and preserves rest days", () => {
    const sessions = [
      "2026-09-21",
      "2026-09-23",
      "2026-09-28",
      "2026-09-30",
    ].map((date) => session(date + "T12:00:00"));
    expect(weeklyStreak(sessions, 2, new Date("2026-10-07T20:00:00"))).toBe(2);
    expect(weeklyStreak(sessions, 2, new Date("2026-10-12T20:00:00"))).toBe(0);
    expect(weeklyStreak(sessions, 0, now)).toBe(0);
  });
  it("does not reward multiple sessions in one day or future/incomplete sessions", () => {
    const sessions = [
      session("2026-10-07T12:00:00"),
      session("2026-10-07T18:00:00"),
      session("2026-10-15T12:00:00"),
      session("2026-10-08T12:00:00", undefined, exercise, {
        completedAt: undefined,
      }),
    ];
    expect(weeklyStreak(sessions, 2, now)).toBe(0);
    expect(weeklyStreak(sessions, 1, now)).toBe(1);
  });
  it("keeps effort/mode-specific records and assistance improvement direction", () => {
    const assisted: Exercise = {
      ...bodyweight,
      measurement: "assisted",
      load: "assistance",
    };
    const records = personalRecords([
      session(
        undefined,
        [set({ weightKg: 20 }), set({ weightKg: 10 }), set({ weightKg: 0 })],
        assisted,
      ),
    ]);
    expect(
      records.find((record) => record.type === "Least assistance")?.value,
    ).toBe(0);
    expect(records.some((record) => record.type === "Heaviest load")).toBe(
      false,
    );
  });
  it("unlocks achievements from real nonempty sessions only, including a return after a break", () => {
    expect(
      achievements([], 3).every((achievement) => !achievement.unlocked),
    ).toBe(true);
    const a = session("2026-08-01T12:00:00"),
      b = session("2026-10-01T12:00:00");
    const unlocked = achievements([a, a, b], 2);
    expect(unlocked.find((item) => item.id === "first")?.unlocked).toBe(true);
    expect(unlocked.find((item) => item.id === "return")?.unlocked).toBe(true);
    expect(unlocked.find((item) => item.id === "sessions-10")?.unlocked).toBe(
      false,
    );
  });
  it("discloses motivational lift-specific strength tiers and accepts custom thresholds", () => {
    expect(strengthTier(exercise, 80, 80)?.label).toBe("Advanced");
    expect(strengthTier(dumbbells, 40, 80)).toBeNull();
    expect(
      strengthTier(exercise, 80, 80, [
        { label: "Practice", ratio: 0 },
        { label: "My milestone", ratio: 1 },
      ])?.label,
    ).toBe("My milestone");
  });
});

describe("exercise dataset and starter integrity", () => {
  it("bundles distinct attributed source instructions and no fabricated history", () => {
    const data = defaultData();
    expect(starterExercises.length).toBeGreaterThan(500);
    expect(new Set(starterExercises.map((item) => item.id)).size).toBe(
      starterExercises.length,
    );
    expect(
      starterExercises.every(
        (item) =>
          item.instructions.length > 0 &&
          item.primary.length > 0 &&
          item.sourceUrl &&
          item.license.includes("Unlicense"),
      ),
    ).toBe(true);
    expect(data.sessions).toEqual([]);
    expect(data.schedule).toEqual([]);
    expect(data.activeSession).toBeNull();
    expect(
      data.templates.every((template) =>
        template.exercises.every((p) =>
          data.exercises.some((item) => item.id === p.exerciseId),
        ),
      ),
    ).toBe(true);
    expect(
      data.programs.every((program) =>
        program.templateIds.every((tid) =>
          data.templates.some((template) => template.id === tid),
        ),
      ),
    ).toBe(true);
  });
  it("separates defaults so edits cannot mutate future installations", () => {
    const a = defaultData();
    a.exercises[0].favorite = true;
    a.profile.progression.sessions = 99;
    const b = defaultData();
    expect(b.exercises[0].favorite).toBeUndefined();
    expect(b.profile.progression.sessions).toBe(2);
  });
});
