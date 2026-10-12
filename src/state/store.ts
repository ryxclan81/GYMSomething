import { create } from "zustand";
import { z } from "zod";
import type { AppData } from "../domain/types";
import { defaultData } from "../data/defaults";
import { validateAIEndpoint } from "../integrations/ai";
import {
  STORAGE_KEY,
  encodePersistedData,
  decodePersistedRecord,
} from "./persistence";
export {
  STORAGE_KEY,
  encodePersistedData,
  decodePersistedData,
} from "./persistence";
interface Store {
  data: AppData;
  ready: boolean;
  error: string | null;
  saving: boolean;
}
export const useApp = create<Store>(() => ({
  data: defaultData(),
  ready: false,
  error: null,
  saving: false,
}));
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let storageBlocked = true;
let recoveryData: unknown;
let persistedRevision = 0;
let persistedRaw: string | null = null;
let replacements = 0;
const writerId = crypto.randomUUID();

function localStorageAdapter(): Storage {
  if (typeof globalThis.localStorage === "undefined")
    throw new Error("Local storage is unavailable on this device.");
  return globalThis.localStorage;
}
function withStorageLock<T>(operation: () => T | Promise<T>): Promise<T> {
  // Supported browsers coordinate tabs with Web Locks. The fallback keeps the
  // read/check/write synchronous, but cannot claim an atomic cross-process CAS.
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(STORAGE_KEY, operation);
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error);
  }
}
const LEGACY_DATABASE = "forma-training";

/** Reads an existing legacy record only. An absent database's creation is aborted. */
async function readLegacyData(): Promise<unknown | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  if (indexedDB.databases) {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === LEGACY_DATABASE))
      return undefined;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE);
    let missing = false;
    request.onupgradeneeded = () => {
      missing = true;
      request.transaction?.abort();
    };
    request.onerror = () =>
      missing
        ? resolve(undefined)
        : reject(
            request.error ?? new Error("Legacy records could not be opened."),
          );
    request.onblocked = () =>
      reject(new Error("Close other Setwise tabs to read legacy records."));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("records")) {
        database.close();
        resolve(undefined);
        return;
      }
      const transaction = database.transaction("records", "readonly");
      const record = transaction.objectStore("records").get("app");
      let data: unknown;
      record.onsuccess = () => {
        data = record.result?.data;
      };
      record.onerror = () =>
        reject(record.error ?? new Error("Legacy records could not be read."));
      transaction.oncomplete = () => {
        database.close();
        resolve(data);
      };
      transaction.onabort = () => {
        database.close();
        reject(
          transaction.error ?? new Error("Legacy reading was interrupted."),
        );
      };
    };
  });
}
async function deleteLegacyData(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LEGACY_DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        request.error ?? new Error("Legacy records could not be deleted."),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Close other Setwise tabs and reset again to remove legacy records.",
        ),
      );
  });
}

export async function initialize() {
  await writes.catch(() => {});
  storageBlocked = true;
  try {
    const storage = localStorageAdapter();
    const existing = storage.getItem(STORAGE_KEY);
    const legacy = existing === null ? await readLegacyData() : undefined;
    recoveryData = legacy;
    const data = await withStorageLock(() => {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        // Preserve the raw record even when a future encoding cannot be opened.
        recoveryData = { storageKey: STORAGE_KEY, raw };
        const stored = decodePersistedRecord(raw);
        recoveryData = stored.data;
        const valid = validateBackup(stored.data);
        persistedRevision = stored.revision;
        persistedRaw = raw;
        return valid;
      }
      const initial =
        legacy === undefined ? defaultData() : validateBackup(legacy);
      const rawInitial = encodePersistedData(initial, 0, writerId);
      storage.setItem(STORAGE_KEY, rawInitial);
      persistedRevision = 0;
      persistedRaw = rawInitial;
      return initial;
    });
    storageBlocked = false;
    recoveryData = undefined;
    writes = Promise.resolve();
    useApp.setState({ data, ready: true, saving: false, error: null });
  } catch (error) {
    storageBlocked = true;
    useApp.setState({
      ready: true,
      error: `Your data could not be opened. Changes are blocked to protect the saved record. Export a recovery backup, restore a valid backup, or explicitly reset in Settings. ${error instanceof Error ? error.message : "Storage is unavailable."}`,
    });
  }
}
export function updateData(change: (draft: AppData) => void): Promise<void> {
  if (storageBlocked || replacements > 0) {
    const blocked = Promise.reject<void>(
      new Error(
        "Saved data could not be loaded. Restore a valid backup or explicitly reset local data in Settings before editing.",
      ),
    );
    blocked.catch(() => {});
    return blocked;
  }
  const draft = structuredClone(useApp.getState().data);
  change(draft);
  draft.updatedAt = new Date().toISOString();
  const current = ++revision;
  useApp.setState({ data: draft, saving: true });
  const result = writes
    .catch(() => {})
    .then(async () => {
      await withStorageLock(() => {
        const storage = localStorageAdapter();
        if (storageBlocked || storage.getItem(STORAGE_KEY) !== persistedRaw) {
          storageBlocked = true;
          throw new Error(
            "Newer changes exist in another Setwise tab. Export this tab’s unsaved backup, then reload before editing.",
          );
        }
        const nextRevision = persistedRevision + 1;
        const raw = encodePersistedData(draft, nextRevision, writerId);
        storage.setItem(STORAGE_KEY, raw);
        persistedRevision = nextRevision;
        persistedRaw = raw;
      });
      if (current === revision) useApp.setState({ saving: false, error: null });
    });
  writes = result;
  result.catch((error) =>
    useApp.setState({
      saving: false,
      error: `Changes could not be saved. Keep this page open and export a backup. ${error instanceof Error ? error.message : "Storage may be full."}`,
    }),
  );
  return result;
}
export async function flushWrites() {
  await writes;
}
const positive = z.number().finite().nonnegative();
const text = z.string().max(100000);
const uid = z.string().min(1).max(200);
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp");
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");
const weekdays = z.array(z.number().int().min(0).max(6));
const programPhase = z
  .object({
    id: uid,
    name: text.min(1),
    startWeek: z.number().int().min(1).max(104),
    endWeek: z.number().int().min(1).max(104),
    repMin: z.number().int().min(1).max(1000).optional(),
    repMax: z.number().int().min(1).max(1000).optional(),
    setsMultiplier: z.number().finite().min(0.1).max(3),
    loadMultiplier: z.number().finite().min(0).max(2),
  })
  .refine(
    (phase) => phase.startWeek <= phase.endWeek,
    "Phase weeks must be in order",
  )
  .refine(
    (phase) =>
      (phase.repMin === undefined) === (phase.repMax === undefined) &&
      (phase.repMin === undefined || phase.repMin <= phase.repMax!),
    "Provide a valid phase repetition range",
  );
const exercise = z
  .object({
    id: uid,
    name: text,
    aliases: z.array(text),
    category: text,
    primary: z.array(text),
    secondary: z.array(text),
    pattern: text,
    equipment: z.array(text),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
    measurement: z.enum([
      "weight-reps",
      "bodyweight",
      "assisted",
      "duration",
      "cardio",
    ]),
    load: z.enum([
      "total",
      "per-hand",
      "machine",
      "added",
      "assistance",
      "none",
    ]),
    description: text,
    instructions: z.array(text),
    mistakes: z.array(text),
    safety: text,
    source: text,
    license: text,
    alternatives: z.array(text),
    defaultTargets: z
      .object({
        sets: z.number().int().min(1).max(100),
        repMin: positive,
        repMax: positive,
        durationSeconds: positive,
        distanceKm: positive,
        restSeconds: positive,
      })
      .optional(),
    progression: z.lazy(() => rule).optional(),
    favorite: z.boolean().optional(),
    custom: z.boolean().optional(),
    archived: z.boolean().optional(),
    notes: text.optional(),
    tags: z.array(text).optional(),
    media: z
      .string()
      .refine(
        (x) =>
          x.startsWith("data:image/") ||
          x.startsWith("data:video/") ||
          x.startsWith(
            "https://raw.githubusercontent.com/yuhonas/free-exercise-db/",
          ),
        "Media must be a local image or video",
      )
      .optional(),
  })
  .passthrough();
const rule = z
  .object({
    strategy: z.enum([
      "double",
      "linear",
      "reps",
      "volume",
      "rir",
      "rpe",
      "percentage",
      "manual",
      "review",
      "skill",
      "duration",
      "distance",
    ]),
    repMin: positive,
    repMax: positive,
    successfulSets: positive,
    sessions: z.number().int().min(1),
    incrementKg: positive,
    percentage: positive,
    minRir: positive,
    maxRpe: positive,
    minDays: positive,
    plateauSessions: positive,
    reviewDays: positive,
  })
  .passthrough();
const prescription = z
  .object({
    id: uid,
    exerciseId: uid,
    sets: z.number().int().min(1).max(100),
    repMin: positive,
    repMax: positive,
    weightKg: positive,
    restSeconds: positive,
    durationSeconds: positive,
    distanceKm: positive,
    group: text,
    notes: text,
    rule: rule.optional(),
  })
  .passthrough();
const workoutSet = z
  .object({
    id: uid,
    weightKg: positive,
    reps: z.number().int().nonnegative(),
    durationSeconds: positive,
    distanceKm: positive,
    type: z.enum([
      "working",
      "warmup",
      "drop",
      "amrap",
      "failure",
      "rest-pause",
      "myo-reps",
      "assisted",
      "timed",
      "custom",
    ]),
    completed: z.boolean(),
    skipped: z.boolean(),
    rir: z.number().min(0).max(10).optional(),
    rpe: z.number().min(0).max(10).optional(),
    completedAt: timestamp.optional(),
  })
  .passthrough();
const session = z
  .object({
    id: uid,
    name: text,
    equipmentId: uid,
    startedAt: timestamp,
    completedAt: timestamp.optional(),
    restEndsAt: positive.optional(),
    restPausedSeconds: positive.optional(),
    focusedExerciseId: uid.optional(),
    notes: text,
    exercises: z.array(
      z
        .object({
          id: uid,
          exerciseId: uid,
          exercise,
          prescription,
          sets: z.array(workoutSet),
          notes: text,
        })
        .passthrough(),
    ),
  })
  .passthrough();
const food = z
  .object({
    id: uid,
    name: text,
    brand: text,
    servingGrams: z.number().positive(),
    calories: positive,
    protein: positive,
    carbs: positive,
    fat: positive,
    fiber: positive.optional(),
    source: text,
  })
  .passthrough();
export const backupSchema = z
  .object({
    schemaVersion: z.literal(1),
    profile: z
      .object({
        name: text,
        unit: z.enum(["kg", "lb"]),
        experience: z.enum(["Beginner", "Intermediate", "Advanced"]),
        focus: z.enum([
          "Hypertrophy",
          "Strength",
          "Endurance",
          "Cardio",
          "Calisthenics",
          "General fitness",
          "Hybrid",
        ]),
        secondaryGoals: z.array(text),
        days: z.array(z.number().int().min(0).max(6)),
        bodyweightKg: z.number().finite().positive().optional(),
        heightCm: z.number().finite().positive().optional(),
        duration: positive,
        split: text,
        restSeconds: positive,
        effort: z.enum(["rir", "rpe", "both", "none"]),
        limitations: text,
        avoid: z.array(text),
        progression: rule,
        nutrition: z.boolean(),
        ai: z.boolean(),
        voice: z.boolean(),
        spotify: z.boolean(),
        gamification: z.boolean(),
        celebrations: z.boolean(),
        indirectFactor: z.number().min(0).max(1),
        onboardingComplete: z.boolean(),
        accent: z.enum(["steel", "violet", "neutral"]).optional(),
        density: z.enum(["comfortable", "compact"]).optional(),
      })
      .passthrough(),
    equipment: z.array(
      z.object({
        id: uid,
        name: text,
        items: z.array(text),
        canIncline: z.boolean(),
        notes: text,
        maxDumbbellKg: positive.optional(),
      }),
    ),
    activeEquipmentId: uid,
    exercises: z.array(exercise),
    templates: z.array(
      z
        .object({
          id: uid,
          name: text,
          description: text,
          focus: text,
          minutes: positive,
          exercises: z.array(prescription),
          updatedAt: timestamp,
          planningSource: z
            .object({
              programId: uid,
              templateId: uid,
              startDate: calendarDate,
              phaseId: uid.optional(),
              lighter: z.boolean(),
              signature: text,
            })
            .optional(),
        })
        .passthrough(),
    ),
    programs: z.array(
      z
        .object({
          id: uid,
          name: text,
          description: text,
          weeks: z.number().int().min(1).max(104),
          startDate: calendarDate,
          templateIds: z.array(uid),
          days: weekdays,
          phase: text,
          phases: z.array(programPhase).optional(),
          deloadWeek: z.number().int().min(1).max(104).optional(),
        })
        .refine(
          (program) =>
            !program.deloadWeek || program.deloadWeek <= program.weeks,
          "Lighter week must be within the program",
        )
        .refine((program) => {
          const phases = [...(program.phases ?? [])].sort(
            (a, b) => a.startWeek - b.startWeek,
          );
          return (
            phases.every(
              (phase, index) =>
                phase.endWeek <= program.weeks &&
                (!index || phase.startWeek > phases[index - 1].endWeek),
            ) && new Set(phases.map((phase) => phase.id)).size === phases.length
          );
        }, "Program phases must be unique, non-overlapping and within the block")
        .passthrough(),
    ),
    schedule: z.array(
      z
        .object({
          id: uid,
          date: calendarDate,
          templateId: text,
          status: z.enum(["planned", "completed", "skipped", "rest"]),
          programId: uid.optional(),
          blockWeek: z.number().int().min(1).max(104).optional(),
          phaseName: text.optional(),
        })
        .passthrough(),
    ),
    sessions: z.array(session),
    activeSession: session.nullable(),
    goals: z.array(
      z
        .object({
          id: uid,
          name: text,
          type: z.enum([
            "weight",
            "reps",
            "e1rm",
            "relative",
            "frequency",
            "volume",
            "duration",
            "distance",
            "pace",
            "hold",
            "skill",
            "bodyweight",
            "custom",
          ]),
          start: z.number().finite(),
          current: z.number().finite(),
          target: z.number().finite(),
          unit: text,
          notes: text,
          deadline: calendarDate.optional(),
          timeline: z
            .object({
              mode: z.enum(["rate", "weeks"]),
              baseline: z.number().finite().nonnegative(),
              ratePerWeek: z.number().finite().positive(),
              weeks: z.number().finite().nonnegative().max(5200),
              anchorDate: calendarDate,
              deadlineMode: z.enum(["estimated", "manual"]),
            })
            .refine(
              (value) => value.mode !== "weeks" || value.weeks > 0,
              "Choose a positive number of planning weeks",
            )
            .optional(),
          history: z.array(
            z.object({ date: timestamp, value: z.number().finite() }),
          ),
        })
        .passthrough(),
    ),
    suggestions: z.array(
      z
        .object({
          id: uid,
          exerciseId: uid,
          createdAt: timestamp,
          status: z.enum(["pending", "accepted", "dismissed", "snoozed"]),
          strategy: rule.shape.strategy,
          current: positive,
          proposed: positive,
          field: z.enum([
            "weightKg",
            "repMax",
            "sets",
            "durationSeconds",
            "distanceKm",
            "review",
          ]),
          templateId: uid.optional(),
          snoozeUntil: timestamp.optional(),
          reason: text,
          confidence: z.enum(["low", "moderate"]),
        })
        .passthrough(),
    ),
    foods: z.array(food),
    diary: z.array(
      z.object({
        id: uid,
        date: calendarDate,
        meal: text,
        foodId: uid,
        food,
        servings: z.number().positive(),
      }),
    ),
    recipes: z.array(
      z.object({
        id: uid,
        name: text,
        servings: z.number().positive(),
        ingredients: z.array(
          z.object({ foodId: uid, servings: z.number().positive() }),
        ),
      }),
    ),
    nutritionTargets: z.object({
      calories: positive,
      protein: positive,
      carbs: positive,
      fat: positive,
      waterMl: positive,
    }),
    water: z.record(calendarDate, positive),
    aiSettings: z.object({
      endpoint: text.refine((value) => {
        try {
          validateAIEndpoint(value);
          return true;
        } catch {
          return false;
        }
      }, "Invalid or credential-bearing AI endpoint"),
      historyConsent: z.boolean(),
      profileConsent: z.boolean(),
      nutritionConsent: z.boolean(),
    }),
    reminders: z.object({
      enabled: z.boolean(),
      time: clockTime,
      days: weekdays,
      quietStart: clockTime,
      quietEnd: clockTime,
      tone: text,
      categories: z.array(text),
    }),
    bodyMetrics: z.array(
      z.object({
        id: uid,
        date: calendarDate,
        weightKg: z.number().positive(),
        note: text,
      }),
    ),
    strengthThresholds: z
      .record(uid, z.array(z.object({ label: text, ratio: positive })))
      .optional(),
    updatedAt: timestamp,
    lastBackup: timestamp.optional(),
  })
  .passthrough();
export function validateBackup(value: unknown): AppData {
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `Invalid backup: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`,
    );
  const result = parsed.data as AppData;
  for (const key of [
    "exercises",
    "equipment",
    "templates",
    "sessions",
    "goals",
    "foods",
    "recipes",
    "schedule",
    "programs",
    "suggestions",
    "diary",
    "bodyMetrics",
  ] as const) {
    const ids = result[key].map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`Duplicate IDs in ${key}.`);
  }
  if (!result.equipment.some((x) => x.id === result.activeEquipmentId))
    throw new Error("The selected equipment profile is missing.");
  const exerciseIds = new Set(result.exercises.map((x) => x.id));
  const templateIds = new Set(result.templates.map((x) => x.id));
  const foodIds = new Set(result.foods.map((x) => x.id));
  for (const entry of result.diary)
    if (entry.food.id !== entry.foodId)
      throw new Error("Diary food snapshot does not match its ID.");
  for (const recipe of result.recipes)
    for (const ingredient of recipe.ingredients)
      if (!foodIds.has(ingredient.foodId))
        throw new Error(`Missing ingredient in ${recipe.name}.`);
  for (const scheduled of result.schedule)
    if (scheduled.status !== "rest" && !templateIds.has(scheduled.templateId))
      throw new Error("A scheduled workout template is missing.");
  for (const program of result.programs)
    if (program.templateIds.some((x) => !templateIds.has(x)))
      throw new Error("A program workout template is missing.");
  for (const ex of result.exercises)
    if (
      ex.defaultTargets &&
      ex.defaultTargets.repMin > ex.defaultTargets.repMax
    )
      throw new Error("Invalid default exercise rep range.");
  for (const t of result.templates)
    for (const p of t.exercises)
      if (!exerciseIds.has(p.exerciseId) || p.repMin > p.repMax)
        throw new Error(`Invalid exercise prescription in ${t.name}.`);
  for (const s of [
    ...result.sessions,
    ...(result.activeSession ? [result.activeSession] : []),
  ]) {
    if (new Set(s.exercises.map((e) => e.id)).size !== s.exercises.length)
      throw new Error("Duplicate session exercise IDs.");
    // Focus is disposable UI state, not a reason to lose an otherwise valid session.
    if (
      s.focusedExerciseId &&
      !s.exercises.some((e) => e.id === s.focusedExerciseId)
    )
      delete s.focusedExerciseId;
    if (
      !Number.isFinite(Date.parse(s.startedAt)) ||
      (s.completedAt && !Number.isFinite(Date.parse(s.completedAt)))
    )
      throw new Error("Invalid session timestamp.");
    for (const e of s.exercises)
      if (
        e.exercise.id !== e.exerciseId ||
        new Set(e.sets.map((x) => x.id)).size !== e.sets.length
      )
        throw new Error("Invalid session exercise or duplicate set IDs.");
  }
  return result;
}
export function exportBackup(): string {
  return JSON.stringify(
    storageBlocked && recoveryData !== undefined
      ? recoveryData
      : useApp.getState().data,
    null,
    2,
  );
}
export async function importBackup(raw: string) {
  if (raw.length > 30_000_000)
    throw new Error("Backup exceeds the 30 MB import limit.");
  const data = validateBackup(JSON.parse(raw));
  await replaceSavedData(data);
}
function replaceSavedData(data: AppData): Promise<void> {
  replacements++;
  const result = writes
    .catch(() => {})
    .then(async () => {
      try {
        await withStorageLock(() => {
          const storage = localStorageAdapter();
          let previousRevision = persistedRevision;
          try {
            const current = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
            if (
              Number.isSafeInteger(current?.revision) &&
              current.revision >= 0
            )
              previousRevision = Math.max(previousRevision, current.revision);
          } catch {
            /* Explicit restore/reset can replace a corrupt record. */
          }
          const nextRevision =
            previousRevision < Number.MAX_SAFE_INTEGER
              ? previousRevision + 1
              : 0;
          const encoded = encodePersistedData(data, nextRevision, writerId);
          storage.setItem(STORAGE_KEY, encoded);
          persistedRevision = nextRevision;
          persistedRaw = encoded;
        });
        ++revision;
        storageBlocked = false;
        recoveryData = undefined;
        useApp.setState({ data, error: null, saving: false });
      } catch (error) {
        useApp.setState({
          saving: false,
          error: `Local data could not be replaced. Existing saved records were preserved. ${error instanceof Error ? error.message : "Storage may be unavailable or full."}`,
        });
        throw error;
      } finally {
        replacements--;
      }
    });
  writes = result;
  result.catch(() => {});
  return result;
}
export async function clearData() {
  await replaceSavedData(defaultData());
  try {
    await deleteLegacyData();
  } catch (error) {
    useApp.setState({
      error: `Local data was reset, but older legacy records could not be removed. ${error instanceof Error ? error.message : "Close other Setwise tabs and try again."}`,
    });
    throw error;
  }
}
