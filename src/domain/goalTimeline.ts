import type { Goal, GoalTimeline, Unit } from "./types";
import { addDays, dateKey, parseDate } from "./helpers";
import { fromKg, toKg } from "./engine";

export const BODYWEIGHT_LOSS_SOURCE =
  "https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html";

export function supportsGoalTimeline(goal: Pick<Goal, "type" | "unit">) {
  return (
    ["bodyweight", "weight", "e1rm"].includes(goal.type) &&
    ["kg", "lb"].includes(goal.unit)
  );
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value)) === value
  );
}

/** Planning arithmetic only: this deliberately does not predict adaptation. */
export function estimateGoalTimeline(goal: Goal) {
  const plan = goal.timeline;
  if (
    !plan ||
    !supportsGoalTimeline(goal) ||
    ![
      goal.start,
      goal.target,
      plan.baseline,
      plan.ratePerWeek,
      plan.weeks,
    ].every(Number.isFinite) ||
    plan.baseline < 0 ||
    plan.ratePerWeek <= 0 ||
    plan.weeks < 0 ||
    !validDate(plan.anchorDate)
  )
    return null;
  const remaining = Math.max(
    0,
    goal.target >= goal.start
      ? goal.target - plan.baseline
      : plan.baseline - goal.target,
  );
  if (plan.mode === "weeks" && plan.weeks <= 0) return null;
  const weeks =
    remaining === 0
      ? 0
      : plan.mode === "weeks"
        ? plan.weeks
        : remaining / plan.ratePerWeek;
  if (weeks > 5200) return null;
  const days = Math.ceil(Math.max(0, weeks * 7 - 1e-9));
  const estimatedDate = addDays(plan.anchorDate, days);
  if (!validDate(estimatedDate)) return null;
  const ratePerWeek =
    plan.mode === "weeks" && remaining > 0
      ? remaining / weeks
      : plan.ratePerWeek;
  return { remaining, weeks, days, estimatedDate, ratePerWeek };
}

export function defaultGoalTimeline(
  goal: Goal,
  baseline = goal.start,
  anchorDate = dateKey(),
): GoalTimeline {
  // CDC context informs the loss example; gain and lifting examples are user
  // planning assumptions, not evidence-backed rates or progression rules.
  const rateKg =
    goal.type === "bodyweight" ? (goal.target < goal.start ? 0.5 : 0.25) : 2.5;
  return {
    mode: "rate",
    baseline,
    ratePerWeek: fromKg(rateKg, goal.unit === "lb" ? "lb" : "kg"),
    weeks: 0,
    anchorDate,
    deadlineMode: goal.deadline ? "manual" : "estimated",
  };
}

export function recalculateGoalTimeline(goal: Goal): Goal {
  const estimate = estimateGoalTimeline(goal);
  if (!goal.timeline || !estimate) return goal;
  return {
    ...goal,
    timeline: {
      ...goal.timeline,
      weeks:
        goal.timeline.mode === "weeks" ? goal.timeline.weeks : estimate.weeks,
      ratePerWeek: estimate.ratePerWeek,
    },
    deadline:
      goal.timeline.deadlineMode === "manual"
        ? goal.deadline
        : estimate.estimatedDate,
  };
}

/** Changing display units preserves physical weights, rate and history. */
export function convertWeightGoalUnit(goal: Goal, nextUnit: Unit): Goal {
  if (!supportsGoalTimeline(goal) || goal.unit === nextUnit) return goal;
  const previous = goal.unit as Unit;
  const convert = (value: number) => fromKg(toKg(value, previous), nextUnit);
  return recalculateGoalTimeline({
    ...goal,
    unit: nextUnit,
    start: convert(goal.start),
    current: convert(goal.current),
    target: convert(goal.target),
    history: goal.history.map((entry) => ({
      ...entry,
      value: convert(entry.value),
    })),
    timeline: goal.timeline
      ? {
          ...goal.timeline,
          baseline: convert(goal.timeline.baseline),
          ratePerWeek: convert(goal.timeline.ratePerWeek),
        }
      : undefined,
  });
}

export function firstGoalAchievement(goal: Goal): string | null {
  if (goal.start === goal.target) return null;
  const increasing = goal.target > goal.start;
  return (
    goal.history
      .map((entry) => ({
        ...entry,
        date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
          ? entry.date
          : dateKey(new Date(entry.date)),
      }))
      .filter((entry) => validDate(entry.date))
      .filter((entry) =>
        increasing ? entry.value >= goal.target : entry.value <= goal.target,
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? null
  );
}
