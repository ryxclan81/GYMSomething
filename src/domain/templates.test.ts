import { describe, expect, it } from "vitest";
import { defaultData } from "../data/defaults";
import { completeSession, createSession } from "./session";
import {
  deleteTemplate,
  scheduledSession,
  sortTemplates,
  templateDeletionImpact,
} from "./templates";
import { getWorkoutIconId, workoutIconIds, workoutIcons } from "./workoutIcons";
import { validateBackup } from "../state/store";

describe("workout library ordering and icon compatibility", () => {
  it("recently saved workouts come first without mutating the source or shuffling equal dates", () => {
    const originals = defaultData().templates;
    const earlier = originals[0],
      tied = originals[1];
    const newest = {
      ...originals[2],
      id: "new-workout",
      updatedAt: "2099-01-01T00:00:00.000Z",
    };
    const input = [earlier, tied, newest];
    expect(sortTemplates(input).map((template) => template.id)).toEqual([
      newest.id,
      earlier.id,
      tied.id,
    ]);
    expect(input.map((template) => template.id)).toEqual([
      earlier.id,
      tied.id,
      newest.id,
    ]);
  });
  it("explicit name, focus and duration ordering override recency", () => {
    const base = defaultData().templates[0];
    const input = [
      {
        ...base,
        id: "z",
        name: "Zeta",
        focus: "Strength" as const,
        minutes: 60,
        updatedAt: "2099-01-01T00:00:00.000Z",
      },
      {
        ...base,
        id: "a",
        name: "Alpha",
        focus: "Cardio" as const,
        minutes: 20,
      },
      {
        ...base,
        id: "b",
        name: "Beta",
        focus: "Hypertrophy" as const,
        minutes: 40,
      },
    ];
    for (const sort of ["name", "focus", "duration"] as const)
      expect(sortTemplates(input, sort).map((template) => template.id)).toEqual(
        ["a", "b", "z"],
      );
  });
  it("every starter has a distinct valid glyph, and older backups infer the same glyph", () => {
    const data = defaultData();
    expect(new Set(data.templates.map((template) => template.icon)).size).toBe(
      data.templates.length,
    );
    expect(workoutIcons.map((icon) => icon.id)).toEqual([...workoutIconIds]);
    for (const template of data.templates) {
      expect(workoutIconIds).toContain(template.icon);
      const { icon, ...older } = template;
      expect(getWorkoutIconId(older)).toBe(icon);
    }
    data.templates.forEach((template) => {
      delete template.icon;
    });
    expect(validateBackup(data).templates).toHaveLength(15);
  });
  it("saved choices beat inferred icons and unsupported backup values are rejected", () => {
    expect(
      getWorkoutIconId({
        id: "tpl-strength",
        icon: "cycling",
        focus: "Strength",
      }),
    ).toBe("cycling");
    const data = defaultData();
    Object.assign(data.templates[0], { icon: "unknown-icon" });
    expect(() => validateBackup(data)).toThrow();
  });
});

function linkedFixture() {
  const data = defaultData();
  const target = data.templates[0];
  data.schedule = [
    {
      id: "done",
      date: "2026-10-11",
      templateId: target.id,
      status: "planned",
    },
    {
      id: "active",
      date: "2026-10-12",
      templateId: target.id,
      status: "planned",
    },
    {
      id: "future",
      date: "2026-10-13",
      templateId: target.id,
      status: "planned",
    },
    {
      id: "skipped",
      date: "2026-10-10",
      templateId: target.id,
      status: "skipped",
    },
    { id: "rest", date: "2026-10-14", templateId: "", status: "rest" },
    {
      id: "other",
      date: "2026-10-15",
      templateId: data.templates[1].id,
      status: "planned",
    },
  ];
  const completed = createSession(data, target, "done");
  completed.exercises[0].sets[0].weightKg = 65;
  completed.exercises[0].sets[0].reps = 7;
  completed.exercises[0].sets[0].completed = true;
  completeSession(data, completed);
  data.activeSession = createSession(data, target, "active");
  data.activeSession.exercises[0].sets[0].weightKg = 81;
  data.activeSession.focusedExerciseId = data.activeSession.exercises[0].id;
  data.activeSession.restEndsAt = Date.now() + 30000;
  data.programs = [
    { ...data.programs[0], id: "block", templateIds: [target.id] },
  ];
  data.suggestions = [
    {
      id: "prompt",
      exerciseId: target.exercises[0].exerciseId,
      templateId: target.id,
      createdAt: new Date().toISOString(),
      status: "pending",
      strategy: "double",
      current: 65,
      proposed: 67.5,
      field: "weightKg",
      reason: "Repeated successful sets.",
      confidence: "moderate",
    },
  ];
  return { data, target };
}

describe("permanent workout deletion", () => {
  it("reviews exact impact before removing records", () => {
    const { data, target } = linkedFixture();
    const before = structuredClone(data);
    const impact = templateDeletionImpact(data, target.id);
    expect(impact.removed.map((entry) => entry.id)).toEqual([
      "future",
      "skipped",
    ]);
    expect(impact.retained.map((entry) => entry.id)).toEqual([
      "done",
      "active",
    ]);
    expect(impact.historyCount).toBe(1);
    expect(impact.preservesActive).toBe(true);
    expect(impact.emptyPrograms.map((program) => program.name)).toEqual([
      data.programs[0].name,
    ]);
    expect(data).toEqual(before);
  });
  it("truly deletes the template, cleans unused plans/programs and preserves playable snapshots", () => {
    const { data, target } = linkedFixture();
    const sessions = structuredClone(data.sessions),
      active = structuredClone(data.activeSession);
    deleteTemplate(data, target.id);
    expect(data.templates.some((template) => template.id === target.id)).toBe(
      false,
    );
    expect(data.schedule.map((entry) => entry.id)).toEqual([
      "done",
      "active",
      "rest",
      "other",
    ]);
    expect(data.schedule.slice(0, 2).map((entry) => entry.templateId)).toEqual([
      "",
      "",
    ]);
    expect(data.programs[0].templateIds).toEqual([]);
    expect(data.sessions).toEqual(sessions);
    expect(data.activeSession).toEqual(active);
    expect(data.suggestions[0].status).toBe("dismissed");
    expect(scheduledSession(data, data.schedule[0])!.name).toBe(target.name);
    expect(
      validateBackup(data).activeSession!.exercises[0].sets[0].weightKg,
    ).toBe(81);
    completeSession(data, data.activeSession!);
    expect(data.schedule.find((entry) => entry.id === "active")!.status).toBe(
      "completed",
    );
    expect(validateBackup(data).sessions).toHaveLength(2);
  });
  it("keeps a skipped calendar entry that is linked to a saved session", () => {
    const { data, target } = linkedFixture();
    data.schedule[0].status = "skipped";
    deleteTemplate(data, target.id);
    expect(data.schedule.find((entry) => entry.id === "done")!.templateId).toBe(
      "",
    );
    expect(data.sessions).toHaveLength(1);
    expect(() => validateBackup(data)).not.toThrow();
  });
  it("protects completed calendar entries with no recoverable session instead of losing them", () => {
    const { data, target } = linkedFixture();
    data.schedule.push({
      id: "old-record",
      date: "2026-10-01",
      templateId: target.id,
      status: "completed",
    });
    const before = structuredClone(data);
    expect(() => deleteTemplate(data, target.id)).toThrow(
      /completed calendar record/,
    );
    expect(data).toEqual(before);
  });
  it("preserves independently frozen phase copies and unrelated calendar records", () => {
    const { data, target } = linkedFixture();
    const frozen = {
      ...structuredClone(target),
      id: "frozen-phase",
      name: "Foundation · phase copy",
      planningSource: {
        programId: data.programs[0].id,
        templateId: target.id,
        startDate: "2026-10-12",
        lighter: false,
        signature: "frozen",
      },
    };
    data.templates.push(frozen);
    data.schedule.push({
      id: "phase-date",
      date: "2026-10-16",
      templateId: frozen.id,
      status: "planned",
    });
    deleteTemplate(data, target.id);
    expect(
      data.templates.find((template) => template.id === frozen.id),
    ).toEqual(frozen);
    expect(
      data.schedule.find((entry) => entry.id === "phase-date")!.templateId,
    ).toBe(frozen.id);
    expect(() => validateBackup(data)).not.toThrow();
  });
  it("does not delete twice or mutate other data when the template is already absent", () => {
    const { data, target } = linkedFixture();
    deleteTemplate(data, target.id);
    const before = structuredClone(data);
    expect(() => deleteTemplate(data, target.id)).toThrow(
      /already been deleted/,
    );
    expect(data).toEqual(before);
  });
});
