import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialize,
  useApp,
  updateData,
  exportBackup,
  importBackup,
  validateBackup,
  clearData,
  flushWrites,
} from "../src/state/store";
import {
  STORAGE_KEY,
  encodePersistedData,
  decodePersistedData,
  decodePersistedRecord,
} from "../src/state/persistence";
import type { AppData, Goal, ProgramPhase } from "../src/domain/types";
import { starterPresetData as defaultData } from "../src/data/defaults";
import {
  createSession,
  completeSession,
  validateSet,
} from "../src/domain/session";
import { sessionStats } from "../src/domain/engine";
import { deleteTemplate } from "../src/domain/templates";

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();
  failWrites = false;
  failReads = false;
  get length() {
    return this.entries.size;
  }
  key(index: number) {
    return [...this.entries.keys()][index] ?? null;
  }
  clear() {
    this.entries.clear();
  }
  removeItem(key: string) {
    this.entries.delete(key);
  }
  getItem(key: string) {
    if (this.failReads)
      throw new DOMException("Storage denied", "SecurityError");
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites)
      throw new DOMException("Phone storage is full", "QuotaExceededError");
    this.entries.set(key, String(value));
  }
}
let storage: MemoryStorage;
const saved = () => decodePersistedData(storage.getItem(STORAGE_KEY)!);
async function writeLegacy(data: unknown) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("forma-training", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("records", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("records", "readwrite");
      transaction
        .objectStore("records")
        .put({ id: "app", data, recordRevision: 9 });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  });
}
async function readLegacy() {
  return new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open("forma-training");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("records", "readonly");
      const record = transaction.objectStore("records").get("app");
      let data: unknown;
      record.onsuccess = () => {
        data = record.result?.data;
      };
      transaction.oncomplete = () => {
        database.close();
        resolve(data);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  });
}
beforeEach(async () => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", {});
  await clearData();
});
afterEach(() => vi.unstubAllGlobals());

function dataWithOptionalPlanning(): AppData {
  const data = defaultData();
  data.profile.accent = "violet";
  data.profile.density = "compact";
  data.programs[0].weeks = 6;
  data.programs[0].phases = [
    {
      id: "build",
      name: "Build",
      startWeek: 1,
      endWeek: 3,
      repMin: 8,
      repMax: 12,
      setsMultiplier: 1,
      loadMultiplier: 1,
    },
    {
      id: "strength",
      name: "Strength",
      startWeek: 4,
      endWeek: 6,
      repMin: 4,
      repMax: 6,
      setsMultiplier: 0.75,
      loadMultiplier: 1.05,
    },
  ];
  const template = structuredClone(data.templates[0]);
  template.id = "planned-copy";
  template.planningSource = {
    programId: data.programs[0].id,
    templateId: data.templates[0].id,
    startDate: "2026-10-11",
    phaseId: "build",
    lighter: false,
    signature: "frozen-targets-v1",
  };
  data.templates.push(template);
  data.schedule.push({
    id: "planned-session",
    date: "2026-10-12",
    templateId: template.id,
    status: "planned",
    programId: data.programs[0].id,
    blockWeek: 1,
    phaseName: "Build",
  });
  data.goals.push({
    id: "weight-plan",
    name: "Bodyweight plan",
    type: "bodyweight",
    start: 75,
    current: 75,
    target: 70,
    unit: "kg",
    notes: "My chosen pace",
    deadline: "2027-04-01",
    history: [{ date: "2026-10-11T12:00:00Z", value: 75 }],
    timeline: {
      mode: "rate",
      baseline: 75,
      ratePerWeek: 0.5,
      weeks: 10,
      anchorDate: "2026-10-11",
      deadlineMode: "manual",
    },
  });
  return data;
}

describe("Optional appearance, program phases and goal timeline backup fields", () => {
  it("retains optional fields and manual dates through compressed restart and full backup restore", async () => {
    const data = dataWithOptionalPlanning();
    await importBackup(JSON.stringify(data));
    expect(saved()).toEqual(data);
    useApp.setState({ data: defaultData(), ready: false });
    await initialize();
    expect(useApp.getState().data).toEqual(data);
    const backup = exportBackup();
    await clearData();
    await importBackup(backup);
    expect(saved()).toEqual(data);
    expect(saved().goals[0].deadline).toBe("2027-04-01");
    expect(saved().goals[0].timeline?.deadlineMode).toBe("manual");
    expect(saved().schedule[0].phaseName).toBe("Build");
  });

  it("restores older schema-one backups without new fields or invented planning settings", async () => {
    const data = defaultData();
    delete data.profile.accent;
    delete data.profile.density;
    for (const program of data.programs) delete program.phases;
    for (const template of data.templates) delete template.planningSource;
    const goal: Goal = {
      id: "legacy-goal",
      name: "Original target",
      type: "bodyweight",
      start: 80,
      current: 78,
      target: 75,
      unit: "kg",
      notes: "Original notes",
      deadline: "2026-12-31",
      history: [{ date: "2026-10-01T12:00:00Z", value: 78 }],
    };
    data.goals.push(goal);
    expect(validateBackup(data)).toEqual(data);
    await importBackup(JSON.stringify(data));
    await initialize();
    expect(saved()).toEqual(data);
    expect(saved().profile).not.toHaveProperty("accent");
    expect(saved().profile).not.toHaveProperty("density");
    expect(saved().goals[0]).toEqual(goal);
    expect(saved().goals[0]).not.toHaveProperty("timeline");
  });

  it.each(["accent", "density"] as const)(
    "rejects an unsupported profile %s",
    (field) => {
      const data = dataWithOptionalPlanning();
      (data.profile as unknown as Record<string, unknown>)[field] =
        "unknown-choice";
      expect(() => validateBackup(data)).toThrow(new RegExp(field));
    },
  );

  it.each<{
    name: string;
    change: (phases: ProgramPhase[]) => void;
  }>([
    {
      name: "overlapping weeks",
      change: (phases) => {
        phases[1].startWeek = 3;
      },
    },
    {
      name: "reversed weeks",
      change: (phases) => {
        phases[0].startWeek = 4;
      },
    },
    {
      name: "weeks outside the block",
      change: (phases) => {
        phases[1].endWeek = 7;
      },
    },
    {
      name: "duplicate phase IDs",
      change: (phases) => {
        phases[1].id = phases[0].id;
      },
    },
    {
      name: "an unpaired repetition range",
      change: (phases) => {
        delete phases[0].repMax;
      },
    },
    {
      name: "a reversed repetition range",
      change: (phases) => {
        phases[0].repMin = 13;
      },
    },
    {
      name: "zero repetitions",
      change: (phases) => {
        phases[0].repMin = 0;
      },
    },
    {
      name: "excessive load scaling",
      change: (phases) => {
        phases[0].loadMultiplier = 2.1;
      },
    },
    {
      name: "insufficient set scaling",
      change: (phases) => {
        phases[0].setsMultiplier = 0;
      },
    },
  ])("rejects program phases with $name", ({ change }) => {
    const data = dataWithOptionalPlanning();
    change(data.programs[0].phases!);
    expect(() => validateBackup(data)).toThrow();
  });

  it.each([
    { field: "startDate", value: "2026-02-31" },
    { field: "lighter", value: "yes" },
    { field: "programId", value: "" },
  ])("rejects malformed planning-source $field", ({ field, value }) => {
    const data = dataWithOptionalPlanning();
    const source = data.templates.at(-1)!.planningSource!;
    (source as unknown as Record<string, unknown>)[field] = value;
    expect(() => validateBackup(data)).toThrow();
  });

  it.each([
    { name: "a zero rate", patch: { ratePerWeek: 0 } },
    { name: "a non-finite rate", patch: { ratePerWeek: Infinity } },
    { name: "a negative baseline", patch: { baseline: -1 } },
    { name: "negative weeks", patch: { weeks: -1 } },
    { name: "excessive weeks", patch: { weeks: 5201 } },
    { name: "zero fixed-duration weeks", patch: { mode: "weeks", weeks: 0 } },
    { name: "an impossible anchor date", patch: { anchorDate: "2026-02-31" } },
    { name: "an unsupported estimate mode", patch: { mode: "forecast" } },
    {
      name: "an unsupported deadline mode",
      patch: { deadlineMode: "predicted" },
    },
  ])("rejects goal timelines with $name", ({ patch }) => {
    const data = dataWithOptionalPlanning();
    Object.assign(data.goals[0].timeline!, patch);
    expect(() => validateBackup(data)).toThrow();
  });

  it("accepts pound-based fixed-duration goals and completed rate plans", () => {
    const data = dataWithOptionalPlanning();
    const goal = data.goals[0];
    Object.assign(goal, { start: 165, current: 160, target: 155, unit: "lb" });
    Object.assign(goal.timeline!, {
      baseline: 160,
      ratePerWeek: 1,
      weeks: 5,
      mode: "weeks",
    });
    expect(validateBackup(data).goals[0]).toEqual(goal);
    Object.assign(goal.timeline!, { baseline: 155, weeks: 0, mode: "rate" });
    expect(validateBackup(data).goals[0].timeline?.weeks).toBe(0);
  });

  it("rejects an invalid new-field backup before replacing existing goals", async () => {
    const data = dataWithOptionalPlanning();
    await importBackup(JSON.stringify(data));
    const previous = storage.getItem(STORAGE_KEY);
    const bad = structuredClone(data);
    bad.goals[0].timeline!.ratePerWeek = 0;
    await expect(importBackup(JSON.stringify(bad))).rejects.toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe(previous);
    expect(useApp.getState().data.goals).toEqual(data.goals);
  });

  it("preserves the saved manual date and exports unsaved timeline edits on quota failure", async () => {
    const data = dataWithOptionalPlanning();
    await importBackup(JSON.stringify(data));
    const previous = storage.getItem(STORAGE_KEY);
    storage.failWrites = true;
    await expect(
      updateData((draft) => {
        draft.goals[0].timeline!.ratePerWeek = 0.25;
        draft.goals[0].timeline!.weeks = 20;
      }),
    ).rejects.toThrow(/full/);
    expect(storage.getItem(STORAGE_KEY)).toBe(previous);
    expect(saved().goals[0].timeline!.ratePerWeek).toBe(0.5);
    expect(saved().goals[0].deadline).toBe("2027-04-01");
    const recovery = JSON.parse(exportBackup()) as AppData;
    expect(recovery.goals[0].timeline!.ratePerWeek).toBe(0.25);
    expect(recovery.goals[0].deadline).toBe("2027-04-01");
    expect(useApp.getState().error).toMatch(/Changes could not be saved/);
  });
});

describe("Phone local storage and full backups", () => {
  it("restores the welcome choice, selected icon and a running hold timer after restart", async () => {
    const data = defaultData();
    data.profile.welcomeStarted = true;
    data.profile.accent = "sage";
    const template = data.templates.find(
      (item) => item.id === "tpl-bodyweight",
    )!;
    template.icon = "home";
    data.activeSession = createSession(data, template);
    const hold = data.activeSession.exercises.find(
      (entry) => entry.exercise.measurement === "duration",
    )!;
    data.activeSession.setTimer = {
      exerciseId: hold.id,
      setId: hold.sets[0].id,
      mode: "countdown",
      elapsedMs: 12000,
      startedAt: Date.now() - 1000,
      targetSeconds: 30,
    };
    await importBackup(JSON.stringify(data));
    await initialize();
    const restored = useApp.getState().data;
    expect(restored.profile.welcomeStarted).toBe(true);
    expect(restored.profile.accent).toBe("sage");
    expect(
      restored.templates.find((item) => item.id === template.id)?.icon,
    ).toBe("home");
    expect(restored.activeSession?.setTimer).toEqual(
      data.activeSession.setTimer,
    );
    expect(
      restored.activeSession?.exercises.find((entry) => entry.id === hold.id)
        ?.sets[0].completed,
    ).toBe(false);
    expect(saved().activeSession?.setTimer).toEqual(
      data.activeSession.setTimer,
    );
  });
  it("restores session snapshots after permanently deleting their original workout", async () => {
    const data = defaultData();
    const template = data.templates[0];
    data.schedule = [
      {
        id: "deleted-workout-day",
        templateId: template.id,
        date: "2026-10-12",
        status: "planned",
      },
    ];
    data.activeSession = createSession(data, template, data.schedule[0].id);
    data.activeSession.exercises[0].sets[0].reps = 9;
    const snapshot = structuredClone(data.activeSession);
    deleteTemplate(data, template.id);
    await importBackup(JSON.stringify(data));
    await initialize();
    expect(
      useApp.getState().data.templates.some((item) => item.id === template.id),
    ).toBe(false);
    expect(useApp.getState().data.activeSession).toEqual(snapshot);
    expect(useApp.getState().data.schedule[0].templateId).toBe("");
    expect(saved().activeSession?.exercises[0].sets[0].reps).toBe(9);
  });
  it("discards obsolete UI timers without losing recorded sets", () => {
    const data = defaultData();
    data.activeSession = createSession(data, data.templates[0]);
    const entry = data.activeSession.exercises[0];
    entry.sets[0].completed = true;
    entry.sets[0].reps = 11;
    data.activeSession.setTimer = {
      exerciseId: entry.id,
      setId: entry.sets[0].id,
      mode: "stopwatch",
      elapsedMs: 9000,
      targetSeconds: 0,
    };
    const validated = validateBackup(data);
    expect(validated.activeSession?.setTimer).toBeUndefined();
    expect(validated.activeSession?.exercises[0].sets[0]).toMatchObject({
      reps: 11,
      completed: true,
    });
  });
  it("rejects orphan recipes, malformed dates and credential-bearing endpoints", () => {
    const d = defaultData();
    d.recipes.push({
      id: "bad-recipe",
      name: "Missing ingredient",
      servings: 1,
      ingredients: [{ foodId: "absent", servings: 1 }],
    });
    expect(() => validateBackup(d)).toThrow(/Missing ingredient/);
    const date = defaultData();
    date.schedule.push({
      id: "date",
      templateId: date.templates[0].id,
      date: "2026-02-31",
      status: "planned",
    });
    expect(() => validateBackup(date)).toThrow(/calendar/);
    const endpoint = defaultData();
    endpoint.aiSettings.endpoint = "https://example.com/api?key=secret";
    expect(() => validateBackup(endpoint)).toThrow(/endpoint/);
    const suggestion = defaultData();
    suggestion.suggestions.push({
      id: "invalid",
      exerciseId: suggestion.exercises[0].id,
      createdAt: new Date().toISOString(),
      status: "pending",
      strategy: "double",
      field: "prototype" as "weightKg",
      current: 10,
      proposed: 12,
      reason: "Invalid field",
      confidence: "moderate",
    });
    expect(() => validateBackup(suggestion)).toThrow(/field/);
  });
  it("rejects a stale tab write instead of replacing newer local records", async () => {
    await initialize();
    const stored = decodePersistedRecord(storage.getItem(STORAGE_KEY)!);
    stored.data.profile.name = "Another tab";
    storage.setItem(
      STORAGE_KEY,
      encodePersistedData(stored.data, stored.revision + 1),
    );
    await expect(
      updateData((d) => {
        d.profile.name = "Stale tab";
      }),
    ).rejects.toThrow(/another Setwise tab/);
    expect(saved().profile.name).toBe("Another tab");
    expect(JSON.parse(exportBackup()).profile.name).toBe("Stale tab");
  });
  it("validates the full seed library including source media and references", () => {
    expect(validateBackup(defaultData()).exercises.length).toBeGreaterThan(700);
  });
  it("recovers an active session after reinitializing local storage", async () => {
    await importBackup(JSON.stringify(defaultData()));
    await updateData((d) => {
      d.activeSession = createSession(d, d.templates[0]);
      d.activeSession.exercises[0].sets[0].reps = 11;
      d.activeSession.exercises[0].sets[0].completed = true;
    });
    await flushWrites();
    useApp.setState({ data: defaultData(), ready: false });
    await initialize();
    expect(
      useApp.getState().data.activeSession?.exercises[0].sets[0].reps,
    ).toBe(11);
  });
  it("serializes rapid numeric edits without overwriting newer values", async () => {
    const a = updateData((d) => {
      d.profile.name = "A";
    });
    const b = updateData((d) => {
      d.profile.name = "B";
    });
    const c = updateData((d) => {
      d.profile.name = "C";
    });
    await Promise.all([a, b, c]);
    expect(saved().profile.name).toBe("C");
  });
  it("keeps template edits separate from session snapshots", async () => {
    await importBackup(JSON.stringify(defaultData()));
    await updateData((d) => {
      d.activeSession = createSession(d, d.templates[0]);
    });
    const original =
      useApp.getState().data.activeSession!.exercises[0].prescription.repMax;
    await updateData((d) => {
      d.templates[0].exercises[0].repMax = 20;
    });
    expect(
      useApp.getState().data.activeSession!.exercises[0].prescription.repMax,
    ).toBe(original);
  });
  it("completes a session idempotently and preserves partial sets", async () => {
    await importBackup(JSON.stringify(defaultData()));
    await updateData((d) => {
      const session = createSession(d, d.templates[0]);
      session.exercises[0].sets[0].completed = true;
      expect(completeSession(d, session)).toBe(true);
      expect(completeSession(d, d.sessions[0])).toBe(false);
    });
    expect(useApp.getState().data.sessions).toHaveLength(1);
    expect(sessionStats(useApp.getState().data.sessions[0]).sets).toBe(1);
  });
  it("restores a complete JSON export after a data reset", async () => {
    await importBackup(JSON.stringify(defaultData()));
    await updateData((d) => {
      d.profile.name = "Restored athlete";
      d.profile.nutrition = true;
      d.activeSession = createSession(d, d.templates[0]);
    });
    const backup = exportBackup();
    await clearData();
    await importBackup(backup);
    expect(useApp.getState().data.profile.name).toBe("Restored athlete");
    expect(useApp.getState().data.activeSession).not.toBeNull();
  });
  it("rejects corrupt backups without modifying saved local records", async () => {
    await updateData((d) => {
      d.profile.name = "Keep me";
    });
    const bad = defaultData();
    bad.templates[0].exercises[0].exerciseId = "missing";
    await expect(importBackup(JSON.stringify(bad))).rejects.toThrow();
    expect(useApp.getState().data.profile.name).toBe("Keep me");
    expect(saved().profile.name).toBe("Keep me");
  });
  it("rejects invalid set data and untrusted media", () => {
    const d = defaultData();
    const s = createSession(d, d.templates[0]);
    const set = s.exercises[0].sets[0];
    expect(validateSet({ ...set, reps: 1.5 }, s.exercises[0].exercise)).toMatch(
      /whole/,
    );
    d.exercises[0].media = "javascript:alert(1)";
    expect(() => validateBackup(d)).toThrow(/Media/);
  });
  it("preserves records when features are disabled", async () => {
    await updateData((d) => {
      d.profile.nutrition = true;
      d.water["2026-10-10"] = 500;
    });
    await updateData((d) => {
      d.profile.nutrition = false;
      d.profile.ai = false;
    });
    expect(useApp.getState().data.water["2026-10-10"]).toBe(500);
  });
  it("keeps an unrelated active session during history corrections", () => {
    const d = defaultData();
    const old = createSession(d, d.templates[0]);
    old.exercises[0].sets[0].completed = true;
    completeSession(d, old);
    d.activeSession = createSession(d, d.templates[1]);
    const activeId = d.activeSession.id;
    completeSession(d, d.sessions[0]);
    expect(d.activeSession?.id).toBe(activeId);
  });
  it("applies approved targets instead of silently copying previous actual values", () => {
    const d = defaultData();
    const old = createSession(d, d.templates[0]);
    old.exercises[0].sets[0].weightKg = 50;
    old.exercises[0].sets[0].completed = true;
    completeSession(d, old);
    d.templates[0].exercises[0].weightKg = 52.5;
    d.templates[0].exercises[0].repMin = 10;
    const next = createSession(d, d.templates[0]);
    expect(next.exercises[0].sets[0].weightKg).toBe(52.5);
    expect(next.exercises[0].sets[0].reps).toBe(10);
  });
  it("protects unsupported stored versions and exports their raw recovery data", async () => {
    const d = defaultData();
    const future = {
      ...d,
      schemaVersion: 2,
      profile: { ...d.profile, name: "Protect my future records" },
    };
    storage.setItem(
      STORAGE_KEY,
      encodePersistedData(future as unknown as typeof d),
    );
    await initialize();
    await expect(
      updateData((x) => {
        x.profile.name = "overwrite";
      }),
    ).rejects.toThrow(/could not be loaded/);
    expect(JSON.parse(exportBackup()).schemaVersion).toBe(2);
    expect(saved().profile.name).toBe("Protect my future records");
  });
  it("stores a compact compressed catalog and exports a complete readable backup", () => {
    const data = defaultData();
    const encoded = encodePersistedData(data, 17);
    expect(encoded.length).toBeLessThan(JSON.stringify(data).length / 10);
    expect(decodePersistedRecord(encoded).revision).toBe(17);
    expect(decodePersistedData(encoded)).toEqual(data);
    const backup = JSON.parse(exportBackup());
    expect(backup.exercises[0].instructions.length).toBeGreaterThan(0);
    expect(backup).not.toHaveProperty("payload");
  });
  it("round trips catalog ordering, removals, overrides, custom media and active snapshots", () => {
    const data = defaultData();
    data.exercises[0].favorite = true;
    data.exercises[0].notes = "Personal technique cue";
    data.exercises.pop();
    data.exercises.reverse();
    data.exercises.push({
      ...structuredClone(data.exercises[0]),
      id: "custom",
      name: "My variation",
      custom: true,
      media: "data:image/png;base64,YQ==",
    });
    data.activeSession = createSession(data, data.templates[0]);
    data.activeSession.focusedExerciseId = data.activeSession.exercises[1].id;
    data.activeSession.restEndsAt = Date.now() + 90000;
    data.activeSession.exercises[0].sets[0].note = "Actual working set";
    expect(decodePersistedData(encodePersistedData(data))).toEqual(data);
  });
  it("never mutates bundled source exercises through decoded state", () => {
    const raw = encodePersistedData(defaultData());
    const first = decodePersistedData(raw);
    first.exercises[0].instructions[0] = "Changed";
    expect(decodePersistedData(raw).exercises[0].instructions[0]).not.toBe(
      "Changed",
    );
  });
  it("rejects corrupt compression and unknown catalog versions while preserving raw recovery", async () => {
    const record = JSON.parse(storage.getItem(STORAGE_KEY)!);
    const raw = JSON.stringify({ ...record, catalog: "future-catalog" });
    storage.setItem(STORAGE_KEY, raw);
    await initialize();
    expect(useApp.getState().error).toMatch(/catalog/);
    expect(JSON.parse(exportBackup()).raw).toBe(raw);
    await expect(
      updateData((data) => {
        data.profile.name = "Overwrite";
      }),
    ).rejects.toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(() =>
      decodePersistedData(JSON.stringify({ ...record, payload: "corrupt" })),
    ).toThrow();
  });
  it("keeps saved data and exports unsaved edits when the phone storage quota is exceeded", async () => {
    await updateData((data) => {
      data.profile.name = "Saved";
    });
    const previous = storage.getItem(STORAGE_KEY);
    storage.failWrites = true;
    await expect(
      updateData((data) => {
        data.profile.name = "Unsaved";
      }),
    ).rejects.toThrow(/full/);
    expect(storage.getItem(STORAGE_KEY)).toBe(previous);
    expect(useApp.getState().error).toMatch(/export a backup/);
    expect(JSON.parse(exportBackup()).profile.name).toBe("Unsaved");
    storage.failWrites = false;
    await updateData((data) => {
      data.profile.name = "Recovered save";
    });
    expect(saved().profile.name).toBe("Recovered save");
    expect(useApp.getState().error).toBeNull();
  });
  it("blocks changes when local storage reads are denied and permits explicit recovery", async () => {
    const previous = storage.getItem(STORAGE_KEY);
    storage.failReads = true;
    await initialize();
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().error).toMatch(/blocked/);
    await expect(
      updateData((data) => {
        data.profile.name = "Unsafe";
      }),
    ).rejects.toThrow();
    storage.failReads = false;
    expect(storage.getItem(STORAGE_KEY)).toBe(previous);
    const replacement = defaultData();
    replacement.profile.name = "Explicit restore";
    await importBackup(JSON.stringify(replacement));
    await updateData((data) => {
      data.profile.name = "Usable again";
    });
    expect(saved().profile.name).toBe("Usable again");
  });
  it("preserves existing local data when an otherwise valid restore exceeds quota", async () => {
    await updateData((data) => {
      data.profile.name = "Keep existing";
    });
    const replacement = defaultData();
    replacement.profile.name = "Cannot store";
    storage.failWrites = true;
    await expect(importBackup(JSON.stringify(replacement))).rejects.toThrow(
      /full/,
    );
    expect(saved().profile.name).toBe("Keep existing");
    expect(useApp.getState().data.profile.name).toBe("Keep existing");
  });
  it("reads valid legacy records into local storage without changing or removing the old record", async () => {
    const old = defaultData();
    old.profile.name = "Legacy athlete";
    old.activeSession = createSession(old, old.templates[0]);
    await writeLegacy(old);
    storage.removeItem(STORAGE_KEY);
    await initialize();
    expect(saved()).toEqual(old);
    expect(await readLegacy()).toEqual(old);
    await updateData((data) => {
      data.profile.name = "New local name";
    });
    expect(((await readLegacy()) as AppData).profile.name).toBe(
      "Legacy athlete",
    );
    await clearData();
    expect(
      (await indexedDB.databases()).some(
        (database) => database.name === "forma-training",
      ),
    ).toBe(false);
  });
  it("keeps legacy records recoverable when migration runs out of local storage", async () => {
    const old = defaultData();
    old.profile.name = "Preserve legacy";
    await writeLegacy(old);
    storage.removeItem(STORAGE_KEY);
    storage.failWrites = true;
    await initialize();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(await readLegacy()).toEqual(old);
    expect(JSON.parse(exportBackup()).profile.name).toBe("Preserve legacy");
    expect(useApp.getState().error).toMatch(/full/);
  });
  it("does not create a database for a new local-storage installation", async () => {
    storage.removeItem(STORAGE_KEY);
    await initialize();
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(await indexedDB.databases()).toEqual([]);
  });
  it("validates unsupported legacy backups before migrating them", async () => {
    const future = { ...defaultData(), schemaVersion: 2 };
    await writeLegacy(future);
    storage.removeItem(STORAGE_KEY);
    await initialize();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(JSON.parse(exportBackup()).schemaVersion).toBe(2);
    expect(await readLegacy()).toEqual(future);
  });
  it("honors Web Locks and protects both branches when two initialized tabs edit", async () => {
    let lockQueue = Promise.resolve();
    const request = vi.fn((_name: string, operation: () => unknown) => {
      const result = lockQueue.then(operation);
      lockQueue = result.then(
        () => {},
        () => {},
      );
      return result;
    });
    vi.stubGlobal("navigator", { locks: { request } });
    await initialize();
    vi.resetModules();
    const otherTab = await import("../src/state/store");
    await otherTab.initialize();
    await updateData((data) => {
      data.profile.name = "Winning tab";
    });
    await expect(
      otherTab.updateData((data) => {
        data.profile.name = "Unsaved branch";
      }),
    ).rejects.toThrow(/another Setwise tab/);
    expect(saved().profile.name).toBe("Winning tab");
    expect(JSON.parse(otherTab.exportBackup()).profile.name).toBe(
      "Unsaved branch",
    );
    expect(request).toHaveBeenCalledWith(STORAGE_KEY, expect.any(Function));
    await otherTab.importBackup(exportBackup());
    await otherTab.updateData((data) => {
      data.profile.name = "Restored branch";
    });
    expect(saved().profile.name).toBe("Restored branch");
  });
  it("clears a stale workout focus while retaining the valid session", () => {
    const data = defaultData();
    data.activeSession = createSession(data, data.templates[0]);
    data.activeSession.focusedExerciseId = "removed-session-exercise";
    expect(
      validateBackup(data).activeSession?.focusedExerciseId,
    ).toBeUndefined();
  });
  it("also detects a different tab record when its numeric revision did not advance", async () => {
    const old = decodePersistedRecord(storage.getItem(STORAGE_KEY)!);
    old.data.profile.name = "Different writer";
    storage.setItem(
      STORAGE_KEY,
      encodePersistedData(old.data, old.revision, "other-writer"),
    );
    await expect(
      updateData((data) => {
        data.profile.name = "Stale overwrite";
      }),
    ).rejects.toThrow(/another Setwise tab/);
    expect(saved().profile.name).toBe("Different writer");
  });
  it("serializes explicit restores and blocks intervening edits until replacement completes", async () => {
    const first = defaultData();
    first.profile.name = "First restore";
    const second = defaultData();
    second.profile.name = "Second restore";
    const a = importBackup(JSON.stringify(first));
    const b = importBackup(JSON.stringify(second));
    await expect(
      updateData((data) => {
        data.profile.name = "Intervening edit";
      }),
    ).rejects.toThrow();
    await Promise.all([a, b]);
    await flushWrites();
    expect(saved().profile.name).toBe("Second restore");
    expect(useApp.getState().data.profile.name).toBe("Second restore");
    await updateData((data) => {
      data.profile.name = "Edit after restore";
    });
    expect(saved().profile.name).toBe("Edit after restore");
  });
  it("does not create a legacy database when database enumeration is unavailable", async () => {
    const actualIndexedDB = indexedDB;
    vi.stubGlobal("indexedDB", {
      open: actualIndexedDB.open.bind(actualIndexedDB),
      deleteDatabase: actualIndexedDB.deleteDatabase.bind(actualIndexedDB),
    });
    storage.removeItem(STORAGE_KEY);
    await initialize();
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(await actualIndexedDB.databases()).toEqual([]);
  });
  it("prefers saved local records and does not read obsolete legacy data", async () => {
    await updateData((data) => {
      data.profile.name = "Local athlete";
    });
    const old = defaultData();
    old.profile.name = "Old athlete";
    await writeLegacy(old);
    await initialize();
    expect(useApp.getState().data.profile.name).toBe("Local athlete");
    expect(((await readLegacy()) as AppData).profile.name).toBe("Old athlete");
  });
  it("preserves additional profile fields through validation, saving and restart", async () => {
    const data = defaultData();
    const expanded = data.profile as typeof data.profile & {
      motivation: string;
    };
    expanded.motivation = "Build a repeatable routine";
    await importBackup(JSON.stringify(data));
    await initialize();
    expect((useApp.getState().data.profile as typeof expanded).motivation).toBe(
      expanded.motivation,
    );
  });
});
