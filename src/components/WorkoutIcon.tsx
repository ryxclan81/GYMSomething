import type { Exercise, Template } from "../domain/types";
import { getWorkoutIconData, type BodyRegion } from "../domain/workoutIcon";

const front: Partial<Record<BodyRegion, string>> = {
  chest: "M14.5 12H19V17H14L13.5 14ZM21 12H25.5L26.5 14L26 17H21Z",
  shoulders: "M12 11L15 10V13L12 15L10.5 14ZM25 10L28 11L29.5 14L28 15L25 13Z",
  biceps:
    "M10.8 15L13.2 16L12.1 20.5L9.7 20ZM26.8 16L29.2 15L30.3 20L27.9 20.5Z",
  triceps:
    "M9.8 14.5L11 15L9.6 20L8.5 19.5ZM29 15L30.2 14.5L31.5 19.5L30.4 20Z",
  forearms:
    "M9.5 21L12 21.5L10.4 26L8.4 25.5ZM28 21.5L30.5 21L31.6 25.5L29.6 26Z",
  core: "M16 18.5H19V22H16ZM21 18.5H24V22H21ZM16.5 23H19V26H16.5ZM21 23H23.5V26H21Z",
  quads: "M15 28L19 28.5L18.2 35H14.4ZM21 28.5L25 28L25.6 35H21.8Z",
  calves: "M14.5 36.5H17.8L17.2 42H14.2ZM22.2 36.5H25.5L25.8 42H22.8Z",
};
const back: Partial<Record<BodyRegion, string>> = {
  shoulders: front.shoulders,
  back: "M15 11.5L19.2 13V18L16 20L14 16ZM20.8 13L25 11.5L26 16L24 20L20.8 18ZM17 21H23L23.5 25H16.5Z",
  triceps:
    "M10.8 15L13.2 16L12.1 20.5L9.7 20ZM26.8 16L29.2 15L30.3 20L27.9 20.5Z",
  forearms: front.forearms,
  glutes: "M15 26.5H19.2V31L14.5 30ZM20.8 26.5H25L25.5 30L20.8 31Z",
  hamstrings:
    "M14.6 31.5L19 32L18.2 35.5H14.4ZM21 32L25.4 31.5L25.6 35.5H21.8Z",
  calves: front.calves,
};

export interface WorkoutIconProps {
  template: Pick<Template, "exercises">;
  exercises: readonly Pick<
    Exercise,
    "id" | "primary" | "secondary" | "measurement" | "category"
  >[];
  size?: number;
  className?: string;
  /** Adjacent workout/muscle text already names this icon in ordinary cards. */
  decorative?: boolean;
}

/** Original schematic muscle glyph. Workout status deliberately belongs to its parent. */
export default function WorkoutIcon({
  template,
  exercises,
  size = 32,
  className = "",
  decorative = true,
}: WorkoutIconProps) {
  const data = getWorkoutIconData(template, exercises);
  const paths = data.view === "back" ? back : front;
  const primary = new Set(data.primary),
    secondary = new Set(data.secondary);
  return (
    <svg
      viewBox="0 0 40 48"
      width={size}
      height={size}
      className={`workout-icon ${className}`.trim()}
      data-workout-kind={data.kind}
      data-body-view={data.view}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : data.label}
      role={decorative ? undefined : "img"}
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{data.label}</title>
      <g stroke="var(--muted)" strokeWidth="1.6">
        <circle cx="20" cy="5" r="3" />
        <path d="M17 10H23L28 11L31 20L33 26L30 27L27 20L26 16V26L27 35L28 44H23L20 32L17 44H12L13 35L14 26V16L13 20L10 27L7 26L9 20L12 11Z" />
      </g>
      {Object.entries(paths).map(([region, path]) => {
        const state = primary.has(region as BodyRegion)
          ? "primary"
          : secondary.has(region as BodyRegion)
            ? "secondary"
            : "inactive";
        return (
          <path
            key={region}
            d={path}
            data-muscle-region={region}
            data-muscle-state={state}
            fill={state === "inactive" ? "none" : "var(--accent)"}
            fillOpacity={state === "primary" ? 1 : 0.3}
            stroke={state === "secondary" ? "var(--accent)" : "none"}
            strokeWidth="0.7"
          />
        );
      })}
      {data.kind === "cardio" && (
        <path
          d="M3 8H7L9 4L12 10L14 7H17"
          stroke="var(--accent)"
          strokeWidth="1.8"
        />
      )}
      {data.kind === "mobility" && (
        <g stroke="var(--accent)" strokeWidth="1.8">
          <path d="M3 17V10H9M31 10H37V17" />
          <path d="M3 10L8 15M37 10L32 15" />
        </g>
      )}
      {data.kind === "general" &&
        !data.primary.length &&
        !data.secondary.length && (
          <path
            d="M16 16H24M20 12V20"
            stroke="var(--accent)"
            strokeWidth="1.8"
          />
        )}
    </svg>
  );
}
