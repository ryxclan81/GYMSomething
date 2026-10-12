import { describe, expect, it } from "vitest";
import { starterExercises } from "../data/exercises";
import { normalizeExerciseSearch, searchExercises } from "./search";

describe("Ranked exercise discovery", () => {
  it.each([
    "Pushups",
    "push ups",
    " push-up ",
    "PUSH—UPS",
    "press ups",
    "psuh",
    "psuhups",
    "push-upps",
  ])("finds the actual standard push-up for %s", (query) => {
    expect(searchExercises(starterExercises, query)[0]?.id).toBe("ex-pushups");
  });
  it.each(["situps", "sit ups", "sit-up", "SIT UPS", "sutups"])(
    "discovers the existing sit-up variations for %s",
    (query) => {
      const results = searchExercises(starterExercises, query);
      expect(results[0]?.id).toBe("ex-3-4-sit-up");
      expect(results.some((exercise) => exercise.name.includes("Sit-Up"))).toBe(
        true,
      );
    },
  );
  it("ignores punctuation and accents while keeping common compound names consistent", () => {
    expect(normalizeExerciseSearch("  Dúmbbells / PUSH-UPS  ")).toBe(
      "dumbbell pushup",
    );
    expect(normalizeExerciseSearch("Body weight squats")).toBe(
      "bodyweight squat",
    );
    expect(normalizeExerciseSearch("DB bench press")).toBe(
      "dumbbell bench press",
    );
    expect(normalizeExerciseSearch("RDL")).toBe("romanian deadlift");
  });
  it("ranks an exact standard name ahead of variations and unrelated favorites", () => {
    const catalog = starterExercises.map((exercise) => ({
      ...exercise,
      favorite: exercise.id !== "ex-pushups",
    }));
    expect(searchExercises(catalog, "pushup")[0].id).toBe("ex-pushups");
    expect(searchExercises(catalog, "Dumbell bench")[0].id).toBe(
      "ex-dumbbell-bench-press",
    );
  });
  it("finds multi-word queries across muscle and equipment metadata", () => {
    const matches = searchExercises(starterExercises, "chest dumb bells");
    expect(
      matches.some((exercise) => exercise.id === "ex-dumbbell-bench-press"),
    ).toBe(true);
    expect(
      matches.some((exercise) => exercise.id === "ex-barbell-full-squat"),
    ).toBe(false);
  });
  it("includes user aliases and custom exercises without requiring seed mutations", () => {
    const exercise = {
      ...starterExercises[0],
      id: "personal",
      name: "My pressing drill",
      aliases: ["Kitchen press"],
      custom: true,
    };
    expect(searchExercises([exercise], "kichen press")).toEqual([exercise]);
    expect(searchExercises([exercise], "Kitchen press")).toEqual([exercise]);
  });
  it("respects a caller's filtered catalog and does not silently bypass equipment filters", () => {
    const filtered = starterExercises.filter(
      (exercise) => exercise.equipment.length === 0,
    );
    expect(searchExercises(filtered, "push ups")[0]?.id).toBe("ex-pushups");
    expect(searchExercises(filtered, "barbell bench press")).toEqual([]);
  });
  it("does not return arbitrary records for an unrelated query or fuzzy single-letter guess", () => {
    expect(searchExercises(starterExercises, "zzzzzzzzzz")).toEqual([]);
    expect(
      searchExercises(
        [starterExercises.find((exercise) => exercise.id === "ex-pushups")!],
        "q",
      ),
    ).toEqual([]);
  });
  it("keeps favorites first for an empty query and supports limits without mutating the catalog", () => {
    const copy = starterExercises
      .slice(0, 5)
      .map((exercise, index) => ({ ...exercise, favorite: index === 4 }));
    const before = structuredClone(copy);
    expect(searchExercises(copy, " ", 2)).toHaveLength(2);
    expect(searchExercises(copy, "")[0]).toBe(copy[4]);
    expect(searchExercises(copy, "", 0)).toEqual([]);
    expect(copy).toEqual(before);
  });
});
