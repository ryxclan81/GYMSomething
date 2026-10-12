import { describe, expect, it } from "vitest";
import { defaultData } from "../data/defaults";
import type { Program } from "./types";
import {
  alignTrainingDays,
  applyProgram,
  previewProgram,
  programValidation,
} from "./planning";
const program = (): Program => ({
  id: "program",
  name: "Training",
  description: "",
  phase: "Foundation",
  startDate: "2026-10-11",
  weeks: 2,
  days: [0, 2, 4],
  templateIds: ["tpl-full-a", "tpl-full-b"],
});
describe("program application", () => {
  it("rotates weekly spacing to put a first workout on the chosen date", () => {
    expect(alignTrainingDays([1, 3, 5], "2026-10-11")).toEqual([0, 2, 4]);
    expect(alignTrainingDays([], "2026-10-11")).toEqual([]);
    const aligned = alignTrainingDays([1, 3, 5], "2026-10-11");
    expect(alignTrainingDays(aligned, "2026-10-11")).toEqual(aligned);
  });
  it("previews every date with correct rotation across block weeks", () => {
    const preview = previewProgram(program(), defaultData().templates);
    expect(preview.entries.map((entry) => entry.date)).toEqual([
      "2026-10-11",
      "2026-10-13",
      "2026-10-15",
      "2026-10-18",
      "2026-10-20",
      "2026-10-22",
    ]);
    expect(preview.entries.map((entry) => entry.baseTemplateId)).toEqual([
      "tpl-full-a",
      "tpl-full-b",
      "tpl-full-a",
      "tpl-full-b",
      "tpl-full-a",
      "tpl-full-b",
    ]);
  });
  it("adds actual calendar workouts once and preserves unrelated plans by default", () => {
    const data = defaultData();
    data.schedule = [
      {
        id: "personal",
        date: "2026-10-11",
        templateId: "tpl-strength",
        status: "planned",
      },
    ];
    expect(applyProgram(data, program()).added).toBe(6);
    expect(applyProgram(data, program()).added).toBe(0);
    expect(data.schedule).toHaveLength(7);
  });
  it("respects explicit rest and skipped occurrences on repeat application", () => {
    const data = defaultData();
    data.schedule = [
      { id: "rest", date: "2026-10-11", templateId: "", status: "rest" },
    ];
    expect(applyProgram(data, program()).added).toBe(5);
    data.schedule[1].status = "skipped";
    expect(applyProgram(data, program()).added).toBe(0);
    expect(data.schedule[1].status).toBe("skipped");
  });
  it("only replaces unstarted planned entries inside the reviewed range", () => {
    const data = defaultData();
    data.schedule = [
      {
        id: "replace",
        date: "2026-10-12",
        templateId: "tpl-strength",
        status: "planned",
      },
      {
        id: "recorded",
        date: "2026-10-13",
        templateId: "tpl-strength",
        status: "completed",
        sessionId: "saved",
      },
      {
        id: "outside",
        date: "2026-11-01",
        templateId: "tpl-strength",
        status: "planned",
      },
      {
        id: "linked",
        date: "2026-10-14",
        templateId: "tpl-strength",
        status: "planned",
        sessionId: "started",
      },
    ];
    expect(applyProgram(data, program(), { mode: "replace" }).replaced).toBe(1);
    expect(data.schedule.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["recorded", "outside", "linked"]),
    );
    expect(data.schedule.some((entry) => entry.id === "replace")).toBe(false);
  });
  it("freezes phase/lighter targets while keeping base templates unchanged", () => {
    const data = defaultData();
    const base = structuredClone(data.templates[0]);
    data.templates[0].exercises[0].weightKg = 100;
    const value = program();
    value.deloadWeek = 2;
    value.phases = [
      {
        id: "phase",
        name: "Strength",
        startWeek: 1,
        endWeek: 2,
        repMin: 4,
        repMax: 6,
        setsMultiplier: 2,
        loadMultiplier: 0.8,
      },
    ];
    applyProgram(data, value);
    const phase = data.templates.find(
      (template) => template.planningSource?.lighter === false,
    )!;
    const lighter = data.templates.find(
      (template) =>
        template.planningSource?.lighter === true &&
        template.planningSource?.templateId === "tpl-full-a",
    )!;
    expect(phase.exercises[0]).toMatchObject({
      sets: 6,
      repMin: 4,
      repMax: 6,
      weightKg: 80,
    });
    expect(lighter.exercises[0]).toMatchObject({ sets: 4, weightKg: 72 });
    expect(data.templates[0].exercises[0]).toMatchObject({
      sets: base.exercises[0].sets,
      repMin: base.exercises[0].repMin,
      weightKg: 100,
    });
    expect(applyProgram(data, value).added).toBe(0);
    const count = data.templates.length;
    applyProgram(data, value);
    expect(data.templates).toHaveLength(count);
  });
  it("preserves a recorded phase occurrence when targets change", () => {
    const data = defaultData(),
      value = program();
    value.phases = [
      {
        id: "phase",
        name: "Strength",
        startWeek: 1,
        endWeek: 2,
        setsMultiplier: 1,
        loadMultiplier: 1,
      },
    ];
    applyProgram(data, value);
    data.schedule[0].status = "completed";
    data.schedule[0].sessionId = "saved";
    value.phases[0].loadMultiplier = 0.5;
    applyProgram(data, value, { mode: "replace" });
    expect(
      data.schedule.filter((entry) => entry.date === "2026-10-11"),
    ).toHaveLength(1);
    expect(data.schedule[0].sessionId).toBe("saved");
  });
  it("rejects archived or missing workouts before any mutation", () => {
    const data = defaultData();
    data.templates[0].archived = true;
    expect(() => applyProgram(data, program())).toThrow(/archived or missing/);
    expect(data.schedule).toHaveLength(0);
  });
  it("validates bounded nonoverlapping phases and paired repetition ranges", () => {
    const value = program();
    value.phases = [
      {
        id: "a",
        name: "A",
        startWeek: 1,
        endWeek: 2,
        setsMultiplier: 1,
        loadMultiplier: 1,
      },
      {
        id: "b",
        name: "B",
        startWeek: 2,
        endWeek: 2,
        setsMultiplier: 1,
        loadMultiplier: 1,
      },
    ];
    expect(programValidation(value)).toContain("overlap");
    value.phases.pop();
    value.phases[0].repMin = 4;
    expect(programValidation(value)).toContain("repetition");
    value.phases[0].repMax = 6;
    expect(programValidation(value)).toBeNull();
    value.startDate = "2026-02-30";
    expect(programValidation(value)).toContain("valid start");
  });
});
