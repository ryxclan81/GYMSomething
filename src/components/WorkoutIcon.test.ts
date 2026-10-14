import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { starterPresetData as defaultData } from "../data/defaults";
import WorkoutIcon, { WorkoutGlyph } from "./WorkoutIcon";
import { workoutIconIds, workoutIconLabel } from "../domain/workoutIcons";

describe("workout icon accessibility", () => {
  const data = defaultData();
  const template = data.templates.find(
    (template) => template.id === "tpl-push",
  )!;
  it("hides decorative card icons to avoid duplicate workout announcements", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkoutIcon, { template, exercises: data.exercises }),
    );
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
    expect(markup).toContain('data-workout-kind="upper-body"');
  });
  it("names standalone icons using actual primary and supporting muscles", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkoutIcon, {
        template: { exercises: [template.exercises[0]] },
        exercises: data.exercises,
        decorative: false,
        size: 40,
      }),
    );
    expect(markup).toContain('role="img"');
    expect(markup).toMatch(/aria-label="[^"]*Chest\. Primary muscles:/);
    expect(markup).toContain("Supporting muscles:");
    expect(markup).not.toContain('aria-hidden="true"');
    expect(markup).toContain('width="40"');
  });
  it("keeps actual muscle descriptions when the user chooses a different glyph", () => {
    const markup = renderToStaticMarkup(createElement(WorkoutIcon, {
      template: { exercises: [template.exercises[0]], icon: "cycling" },
      exercises: data.exercises,
      decorative: false,
    }));
    expect(markup).toContain('data-icon-id="cycling"');
    expect(markup).toContain('aria-label="Cycling. Chest. Primary muscles:');
    expect(markup).toContain("Supporting muscles:");
  });
  it("renders every selectable glyph with an accessible standalone name", () => {
    for (const icon of workoutIconIds) {
      const markup = renderToStaticMarkup(createElement(WorkoutGlyph, { icon, decorative: false }));
      expect(markup).toContain('role="img"');
      expect(markup).toContain(`aria-label="${workoutIconLabel(icon)}"`);
      expect(markup).toMatch(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b/);
      expect(markup).not.toContain('d="undefined"');
    }
  });
});
