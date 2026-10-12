import LZString from "lz-string";
import type { AppData, Exercise } from "../domain/types";
import { starterExercises } from "../data/exercises";

export const STORAGE_KEY = "forma.data.v1";
export const STORAGE_FORMAT = "forma-local-v1";
const seed = new Map(
  starterExercises.map((exercise) => [exercise.id, exercise]),
);
const seedJSON = new Map(
  starterExercises.map((exercise) => [exercise.id, JSON.stringify(exercise)]),
);
// A changed bundled catalog requires a deliberate migration, never silent rehydration.
const catalogJSON = JSON.stringify(starterExercises);
let hash = 2166136261;
for (let i = 0; i < catalogJSON.length; i++)
  hash = Math.imul(hash ^ catalogJSON.charCodeAt(i), 16777619);
export const CATALOG_VERSION = `exercise-v1-${(hash >>> 0).toString(16)}`;

interface CompactData {
  data: Omit<AppData, "exercises">;
  exercises: { order: string[]; overrides: Exercise[] };
}
export interface PersistedRecord {
  data: AppData;
  revision: number;
  writerId: string;
}

/** Only browser persistence uses compression. Exported backups remain complete readable AppData. */
export function encodePersistedData(
  data: AppData,
  revision = 0,
  writerId: string = crypto.randomUUID(),
): string {
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new Error("Invalid local storage revision.");
  const { exercises, ...remaining } = data;
  const compact: CompactData = {
    data: remaining,
    exercises: {
      order: exercises.map((exercise) => exercise.id),
      overrides: exercises.filter(
        (exercise) => JSON.stringify(exercise) !== seedJSON.get(exercise.id),
      ),
    },
  };
  return JSON.stringify({
    format: STORAGE_FORMAT,
    catalog: CATALOG_VERSION,
    revision,
    writerId,
    encoding: "lz-string-utf16",
    payload: LZString.compressToUTF16(JSON.stringify(compact)),
  });
}

/** Rehydrates the catalog; callers accepting untrusted records must also run validateBackup. */
export function decodePersistedRecord(raw: string): PersistedRecord {
  const record = JSON.parse(raw) as Record<string, unknown>;
  if (
    !record ||
    record.format !== STORAGE_FORMAT ||
    record.encoding !== "lz-string-utf16"
  )
    throw new Error(
      "Unsupported local storage format. Keep a recovery export before upgrading or resetting.",
    );
  if (record.catalog !== CATALOG_VERSION)
    throw new Error(
      "This record uses a different exercise catalog version and needs a migration.",
    );
  if (
    !Number.isSafeInteger(record.revision) ||
    Number(record.revision) < 0 ||
    typeof record.writerId !== "string" ||
    !record.writerId
  )
    throw new Error("Invalid local storage revision.");
  if (typeof record.payload !== "string")
    throw new Error("Missing compressed local data.");
  const json = LZString.decompressFromUTF16(record.payload);
  if (!json || json.length > 30_000_000)
    throw new Error("Local data is corrupt or exceeds the supported size.");
  const compact = JSON.parse(json) as CompactData;
  if (
    !compact?.data ||
    typeof compact.data !== "object" ||
    !Array.isArray(compact.exercises?.order) ||
    !Array.isArray(compact.exercises.overrides)
  )
    throw new Error("Invalid compact local data.");
  const overrides = new Map<string, Exercise>();
  for (const exercise of compact.exercises.overrides) {
    if (
      !exercise ||
      typeof exercise.id !== "string" ||
      overrides.has(exercise.id)
    )
      throw new Error("Invalid exercise overrides.");
    overrides.set(exercise.id, exercise);
  }
  const order = compact.exercises.order;
  if (
    order.some((id) => typeof id !== "string") ||
    new Set(order).size !== order.length
  )
    throw new Error("Invalid exercise catalog order.");
  if ([...overrides.keys()].some((id) => !order.includes(id)))
    throw new Error("An exercise override is missing from the catalog order.");
  const exercises = order.map((id) => {
    const exercise = overrides.get(id) ?? seed.get(id);
    if (!exercise)
      throw new Error(`Missing bundled or custom exercise: ${id}.`);
    return structuredClone(exercise);
  });
  return {
    data: { ...compact.data, exercises },
    revision: Number(record.revision),
    writerId: record.writerId,
  };
}

export function decodePersistedData(raw: string): AppData {
  return decodePersistedRecord(raw).data;
}
