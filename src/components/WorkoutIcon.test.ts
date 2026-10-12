import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultData } from "../data/defaults";
import WorkoutIcon from "./WorkoutIcon";

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
    expect(markup).toContain('aria-label="Chest. Primary muscles:');
    expect(markup).toContain("Supporting muscles:");
    expect(markup).not.toContain('aria-hidden="true"');
    expect(markup).toContain('width="40"');
  });
});
