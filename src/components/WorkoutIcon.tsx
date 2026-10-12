import type { SVGProps } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bike,
  BicepsFlexed,
  Dumbbell,
  Footprints,
  HeartPulse,
  House,
  PersonStanding,
  StretchVertical,
  Target,
  Timer,
  Weight,
} from "lucide-react";
import type { Exercise, Template } from "../domain/types";
import { getWorkoutIconData } from "../domain/workoutIcon";
import {
  getWorkoutIconId,
  workoutIconLabel,
  type WorkoutIconId,
} from "../domain/workoutIcons";

const glyphs = {
  "full-body": PersonStanding,
  dumbbell: Dumbbell,
  "upper-body": BicepsFlexed,
  push: ArrowUpFromLine,
  pull: ArrowDownToLine,
  core: Target,
  cycling: Bike,
  walking: Footprints,
  mobility: StretchVertical,
  recovery: HeartPulse,
  timer: Timer,
  home: House,
  hybrid: Activity,
  strength: Weight,
};
const paths: Partial<Record<WorkoutIconId, string>> = {
  barbell: "M2 12h20M3 8v8M6 6v12M18 6v12M21 8v8",
  bench: "M3 16h18M5 16v5M19 16v5M8 12l4-3 5 3M12 9V4M7 4h10M8 2v4M16 2v4",
  "lower-body": "M10 7l-1 5 5 3 1 6M9 12l-4 4v5M12 8l5 3 3-1",
  legs: "M10 7l-2 5 6 2-3 7M8 12l-5 3 3 6M10 8l5 3 5-1M3 21h4M10 21h4",
  bodyweight: "M3 9l9 2 5-2M6 10l-2 8M15 10l3 8M2 20h20",
  running: "M13 8l-3 4 4 3-4 6M10 12l-5 1-3-2M13 8l4 4 4-1M14 15l4 4",
  rowing: "M2 18h20M4 18l4-4h7l4 4M9 12l2-5 4 4 5 1M10 8L5 6M11 13l4 1",
  hinge: "M13 7l-5 4 4 4-2 6M8 11l-3 5 2 5M13 7l5 6v4M15 17h6M16 15v4M20 15v4",
};
const heads: Partial<Record<WorkoutIconId, { cx: number; cy: number }>> = {
  "lower-body": { cx: 11, cy: 3 },
  legs: { cx: 11, cy: 3 },
  bodyweight: { cx: 20, cy: 7 },
  running: { cx: 15, cy: 4 },
  rowing: { cx: 13, cy: 3 },
  hinge: { cx: 16, cy: 4 },
};

export function WorkoutGlyph({
  icon,
  size = 32,
  decorative = true,
  label,
  className = "",
  ...attributes
}: SVGProps<SVGSVGElement> & {
  icon: WorkoutIconId;
  size?: number;
  decorative?: boolean;
  label?: string;
}) {
  const accessibleLabel = label ?? workoutIconLabel(icon);
  const common = {
    ...attributes,
    width: size,
    height: size,
    className: `workout-icon ${className}`.trim(),
    "aria-hidden": decorative ? true : undefined,
    "aria-label": decorative ? undefined : accessibleLabel,
    role: decorative ? undefined : "img",
    focusable: "false" as const,
    strokeWidth: 1.75,
  };
  const Glyph = glyphs[icon as keyof typeof glyphs];
  if (Glyph) return <Glyph {...common} data-icon-id={icon} />;
  const head = heads[icon];
  return (
    <svg
      {...common}
      data-icon-id={icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{accessibleLabel}</title>
      {head && <circle cx={head.cx} cy={head.cy} r="1.8" />}
      <path d={paths[icon]} />
    </svg>
  );
}

export interface WorkoutIconProps {
  template: Pick<Template, "exercises"> &
    Partial<Pick<Template, "id" | "icon" | "focus">>;
  exercises: readonly Pick<
    Exercise,
    "id" | "primary" | "secondary" | "measurement" | "category"
  >[];
  size?: number;
  className?: string;
  decorative?: boolean;
}

/** A chosen workout glyph supplements the actual muscle labels, never replaces them. */
export default function WorkoutIcon({
  template,
  exercises,
  size = 32,
  className = "",
  decorative = true,
}: WorkoutIconProps) {
  const muscles = getWorkoutIconData(template, exercises);
  const icon = getWorkoutIconId(template);
  return (
    <WorkoutGlyph
      icon={icon}
      size={size}
      className={className}
      decorative={decorative}
      label={`${workoutIconLabel(icon)}. ${muscles.label}`}
      data-workout-kind={muscles.kind}
      data-body-view={muscles.view}
    />
  );
}
