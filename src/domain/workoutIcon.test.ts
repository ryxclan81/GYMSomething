import { describe, expect, it } from "vitest";
import { defaultData } from "../data/defaults";
import { getWorkoutIconData, muscleRegion } from "./workoutIcon";
import type { Exercise, Prescription, Template } from "./types";

const selected = (exerciseId: string, sets = 3): Prescription => ({
  id: `${exerciseId}-${sets}`,
  exerciseId,
  sets,
  repMin: 8,
  repMax: 12,
  weightKg: 0,
  restSeconds: 90,
  durationSeconds: 0,
  distanceKm: 0,
  group: "",
  notes: "",
});
const muscles = (
  id: string,
  primary: string[],
  secondary: string[] = [],
): Pick<
  Exercise,
  "id" | "primary" | "secondary" | "category" | "measurement"
> => ({
  id,
  primary,
  secondary,
  category: "Resistance",
  measurement: "weight-reps",
});

describe("workout muscle icons", () => {
  it("uses edited exercises rather than the workout title or focus", () => {
    const template = {
      name: "Chest day",
      focus: "Cardio",
      exercises: [selected("squat")],
    };
    const icon = getWorkoutIconData(template, [
      muscles("squat", ["Quads"], ["Glutes"]),
    ]);
    expect(icon.kind).toBe("legs");
    expect(icon.label).toContain("Primary muscles: Quads");
    expect(icon.label).not.toContain("Chest");
  });

  it("keeps actual primary muscles ahead of supporting regions", () => {
    const icon = getWorkoutIconData({ exercises: [selected("press")] }, [
      muscles("press", ["Chest"], ["Chest", "Triceps", "Shoulders"]),
    ]);
    expect(icon.kind).toBe("chest");
    expect(icon.primary).toEqual(["chest"]);
    expect(icon.secondary).toEqual(["triceps", "shoulders"]);
    expect(icon.view).toBe("front");
  });

  it("distinguishes real push, pull, lower and full-body starter workouts", () => {
    const data = defaultData();
    for (const [id, kind] of [
      ["tpl-push", "upper-body"],
      ["tpl-pull", "back"],
      ["tpl-lower-a", "legs"],
      ["tpl-full-a", "full-body"],
    ]) {
      const template = data.templates.find((template) => template.id === id)!;
      expect(getWorkoutIconData(template, data.exercises).kind, id).toBe(kind);
    }
  });

  it("summarizes the selected prescription emphasis without changing records", () => {
    const catalog = [muscles("press", ["Chest"]), muscles("curl", ["Biceps"])];
    const template = { exercises: [selected("press", 6), selected("curl", 1)] };
    const before = structuredClone({ template, catalog });
    expect(getWorkoutIconData(template, catalog).kind).toBe("chest");
    template.exercises[0].sets = 1;
    template.exercises[1].sets = 6;
    expect(getWorkoutIconData(template, catalog).kind).toBe("arms");
    expect(catalog).toEqual(before.catalog);
    expect(template.exercises.map((item) => item.weightKg)).toEqual([0, 0]);
  });

  it("recognizes cardio/mobility from actual movements, including renamed templates", () => {
    const run = {
      ...muscles("run", ["Quads"], ["Calves"]),
      measurement: "cardio" as const,
      category: "Cardio",
    };
    const stretch = {
      ...muscles("stretch", ["Hamstrings"]),
      category: "Mobility",
    };
    expect(
      getWorkoutIconData({ exercises: [selected("run")] }, [run]).kind,
    ).toBe("cardio");
    expect(
      getWorkoutIconData({ exercises: [selected("stretch")] }, [stretch]).kind,
    ).toBe("mobility");
  });

  it("does not invent muscle targets for empty, missing or unfamiliar custom movements", () => {
    expect(getWorkoutIconData({ exercises: [] }, []).kind).toBe("general");
    const missing = getWorkoutIconData(
      { exercises: [selected("missing")] },
      [],
    );
    expect(missing.primary).toEqual([]);
    expect(missing.label).toBe("Workout");
    const custom = getWorkoutIconData({ exercises: [selected("custom")] }, [
      muscles("custom", ["My custom skill"]),
    ]);
    expect(custom.kind).toBe("general");
    expect(custom.label).toContain("My custom skill");
  });

  it("normalizes muscle aliases and avoids duplicated region weight within a movement", () => {
    expect(muscleRegion(" Lower-back ")).toBe("back");
    expect(muscleRegion("rectus abdominis")).toBe("core");
    const template = { exercises: [selected("row", 3), selected("press", 4)] };
    const icon = getWorkoutIconData(template, [
      muscles("row", ["Upper back", "Lats", "Traps"]),
      muscles("press", ["Chest"]),
    ]);
    expect(icon.kind).toBe("chest");
  });

  it("uses supporting muscles as a fallback without misrepresenting them as primary", () => {
    const template: Pick<Template, "exercises"> = {
      exercises: [selected("custom")],
    };
    const icon = getWorkoutIconData(template, [
      muscles("custom", [], ["Hamstrings"]),
    ]);
    expect(icon.kind).toBe("legs");
    expect(icon.primary).toEqual([]);
    expect(icon.secondary).toEqual(["hamstrings"]);
    expect(icon.view).toBe("back");
  });
});
