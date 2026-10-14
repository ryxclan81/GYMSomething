import { describe, expect, it } from "vitest";
import { defaultData, starterPresetData } from "../data/defaults";
import { equipmentCompatibility } from "./engine";
import { addRecommendedPresets, recommendPresets } from "./presets";
import { validateBackup } from "../state/store";

describe("explicit matching presets", () => {
  it("new personal data starts without saved presets, programs, schedules or history", () => {
    const data = defaultData();
    expect(data.templates).toEqual([]);
    expect(data.programs).toEqual([]);
    expect(data.schedule).toEqual([]);
    expect(data.sessions).toEqual([]);
    expect(data.exercises.length).toBeGreaterThan(700);
    expect(starterPresetData().templates).toHaveLength(15);
  });
  it("floor calisthenics never silently requires a pull-up bar or other inventory", () => {
    const data = defaultData();
    data.profile.focus = "Calisthenics";
    const equipment = data.equipment.find((item) => item.id === "eq-travel")!;
    const result = recommendPresets(data.profile, equipment, data.exercises);
    expect(result.templates).toHaveLength(1);
    const movementIds = result.templates.flatMap((template) =>
      template.exercises.map((entry) => entry.exerciseId),
    );
    expect(movementIds).toContain("ex-pushups");
    expect(movementIds).toContain("ex-bodyweight-squat");
    expect(movementIds).not.toContain("ex-pullups");
    for (const movementId of movementIds)
      expect(
        equipmentCompatibility(
          data.exercises.find((exercise) => exercise.id === movementId)!,
          equipment,
        ).compatible,
      ).toBe(true);
    expect(result.program.weeks).toBeUndefined();
  });
  it("equipment, training days, experience and time limit bound the selected rotation", () => {
    const data = defaultData();
    const profile = {
      ...data.profile,
      focus: "Hypertrophy" as const,
      experience: "Advanced" as const,
      days: [1, 2, 4, 5],
      duration: 60,
    };
    const result = recommendPresets(profile, data.equipment[0], data.exercises);
    expect(result.templates).toHaveLength(4);
    expect(result.program.templateIds).toEqual(
      result.templates.map((template) => template.id),
    );
    expect(result.program.days).toEqual(profile.days);
    const brief = recommendPresets(
      { ...profile, experience: "Beginner", duration: 20 },
      data.equipment[1],
      data.exercises,
    );
    expect(brief.templates.length).toBeLessThanOrEqual(2);
    for (const template of brief.templates) {
      expect(template.minutes).toBeLessThanOrEqual(20);
      expect(template.exercises.length).toBeLessThanOrEqual(2);
      for (const target of template.exercises) {
        const exercise = data.exercises.find(
          (item) => item.id === target.exerciseId,
        )!;
        expect(exercise.difficulty).toBe("Beginner");
        expect(
          equipmentCompatibility(exercise, data.equipment[1]).compatible,
        ).toBe(true);
        expect(target.sets).toBeLessThanOrEqual(2);
      }
    }
  });
  it("avoided exercises are excluded and recommendations do not mutate the catalog or profile", () => {
    const data = defaultData();
    data.profile.focus = "Calisthenics";
    data.profile.avoid = ["ex-pushups", "ex-bodyweight-squat"];
    const before = structuredClone(data);
    const result = recommendPresets(
      data.profile,
      data.equipment[2],
      data.exercises,
    );
    expect(
      result.templates
        .flatMap((template) => template.exercises)
        .every((target) => !data.profile.avoid.includes(target.exerciseId)),
    ).toBe(true);
    expect(data).toEqual(before);
  });
  it("adding is idempotent, preserves existing edits and never schedules or fabricates sessions", () => {
    const data = defaultData();
    const result = recommendPresets(
      data.profile,
      data.equipment[0],
      data.exercises,
    );
    const count = addRecommendedPresets(data, result);
    expect(count).toBeGreaterThan(0);
    data.templates[0].name = "My own edited name";
    expect(addRecommendedPresets(data, result)).toBe(0);
    expect(data.templates[0].name).toBe("My own edited name");
    expect(data.programs).toHaveLength(1);
    expect(data.schedule).toEqual([]);
    expect(data.sessions).toEqual([]);
    const restored = validateBackup(JSON.parse(JSON.stringify(data)));
    expect(restored.templates).toHaveLength(count);
    expect(restored.programs[0].weeks).toBeUndefined();
  });
});
