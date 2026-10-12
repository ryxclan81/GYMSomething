import { describe, expect, it } from "vitest";
import type { Goal } from "./types";
import {
  convertWeightGoalUnit,
  defaultGoalTimeline,
  estimateGoalTimeline,
  firstGoalAchievement,
  recalculateGoalTimeline,
} from "./goalTimeline";
const goal = (): Goal => {
  const value: Goal = {
    id: "g",
    name: "Weight goal",
    type: "bodyweight",
    start: 80,
    current: 80,
    target: 70,
    unit: "kg",
    notes: "",
    history: [],
  };
  return { ...value, timeline: defaultGoalTimeline(value, 80, "2026-10-11") };
};
describe("editable weight goal timelines", () => {
  it("uses current weight and target to estimate gradual loss in weeks and calendar days", () => {
    expect(estimateGoalTimeline(goal())).toMatchObject({
      remaining: 10,
      weeks: 20,
      days: 140,
      estimatedDate: "2027-02-28",
    });
    const value = goal();
    value.timeline!.baseline = 75;
    expect(estimateGoalTimeline(value)?.weeks).toBe(10);
  });
  it("supports gain and lift planning without changing progression rules", () => {
    const value = goal();
    value.target = 85;
    value.timeline = defaultGoalTimeline(value, 80, "2026-10-11");
    expect(estimateGoalTimeline(value)?.weeks).toBe(20);
    value.type = "weight";
    value.target = 100;
    value.timeline = defaultGoalTimeline(value, 80, "2026-10-11");
    expect(estimateGoalTimeline(value)?.weeks).toBe(8);
  });
  it("derives the implied weekly change from an explicitly edited duration", () => {
    const value = goal();
    value.timeline!.mode = "weeks";
    value.timeline!.weeks = 10;
    expect(recalculateGoalTimeline(value)).toMatchObject({
      deadline: "2026-12-20",
      timeline: { ratePerWeek: 1, weeks: 10 },
    });
  });
  it("preserves a manually chosen deadline until estimated date is requested", () => {
    const value = goal();
    value.deadline = "2027-10-11";
    value.timeline!.deadlineMode = "manual";
    expect(recalculateGoalTimeline(value).deadline).toBe("2027-10-11");
    value.timeline!.deadlineMode = "estimated";
    expect(recalculateGoalTimeline(value).deadline).toBe("2027-02-28");
  });
  it("converts units without changing physical weights, duration or recorded history", () => {
    const value = goal();
    value.history = [{ date: "2026-10-12", value: 79 }];
    const pounds = convertWeightGoalUnit(value, "lb");
    expect(pounds.start).toBeCloseTo(176.3698, 3);
    expect(estimateGoalTimeline(pounds)?.weeks).toBeCloseTo(20);
    const restored = convertWeightGoalUnit(pounds, "kg");
    expect(restored.history[0].value).toBeCloseTo(79);
    expect(restored.timeline!.ratePerWeek).toBeCloseTo(0.5);
  });
  it.each([0, -1, Infinity, NaN])("rejects invalid rate %s", (rate) => {
    const value = goal();
    value.timeline!.ratePerWeek = rate;
    expect(estimateGoalTimeline(value)).toBeNull();
  });
  it("rejects invalid dates and unbounded estimates, and leaves legacy goals usable", () => {
    const value = goal();
    value.timeline!.anchorDate = "2026-02-30";
    expect(estimateGoalTimeline(value)).toBeNull();
    value.timeline!.anchorDate = "2026-10-11";
    value.timeline!.ratePerWeek = 0.00001;
    expect(estimateGoalTimeline(value)).toBeNull();
    delete value.timeline;
    expect(recalculateGoalTimeline(value)).toEqual(value);
  });
  it("shows the first recorded achievement for decreasing and increasing goals", () => {
    const value = goal();
    value.history = [
      { date: "2026-12-01", value: 69 },
      { date: "2026-11-01", value: 70 },
    ];
    expect(firstGoalAchievement(value)).toBe("2026-11-01");
    value.target = 90;
    value.history = [
      { date: "2026-11-01", value: 89 },
      { date: "2026-12-01", value: 91 },
    ];
    expect(firstGoalAchievement(value)).toBe("2026-12-01");
    value.history = [];
    expect(firstGoalAchievement(value)).toBeNull();
    value.history = [{ date: "2026-12-01T12:00:00.000Z", value: 91 }];
    expect(firstGoalAchievement(value)).toMatch(/^2026-12-\d{2}$/);
  });
});
