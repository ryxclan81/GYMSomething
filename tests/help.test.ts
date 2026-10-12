import { describe, expect, it } from "vitest";
import {
  describeHelpControl,
  helpTopics,
  type HelpControlKind,
} from "../src/data/help";

describe("Beginner control explanations", () => {
  it.each([
    ["Bench press set 1 RIR", "how many more good repetitions", "RIR 2"],
    ["Bench press set 1 RPE", "0 to 10", "subjective"],
    ["Estimated 1RM", "1–10 reps", "not a tested maximum"],
    ["Rest pause", "short breaks", "does not automatically split"],
    ["Myo reps", "small groups", "separate set"],
    ["Lighter week", "less work", "completed sessions"],
    ["External volume load", "weight multiplied by repetitions", "Body mass"],
    ["Indirect muscle-set contribution", "fraction", "Warm-ups"],
    [
      "Weekly weight change (kg/week)",
      "positive amount",
      "chose your own deadline",
    ],
    [
      "Planning weeks",
      "weekly weight change needed",
      "actual progress can vary",
    ],
    ["Current weight for estimate (lb)", "not a prediction", "stays fixed"],
    ["Saved on this device", "local storage", "Clearing site data"],
    ["Offline", "cached", "need a connection"],
    ["Protein target", "Grams", "not an individual prescription"],
    ["Serving grams", "portion", "0.5 servings"],
    ["Barcode", "type the number", "does not guarantee"],
    ["Secure AI endpoint", "HTTPS", "server"],
    [
      "Share training preferences",
      "permissions are separate",
      "future requests",
    ],
    ["Spotify", "Premium", "active playback device"],
    ["In-app training reminders", "app to be active", "not guaranteed"],
    ["Measurement units", "2.2 pounds", "individual goals"],
    ["Experience", "familiarity", "not a test"],
    ["Primary training focus", "building muscle", "bodyweight skills"],
    ["Preferred split", "Full body", "Upper/lower"],
    ["Effort tracking", "RIR", "RPE"],
    ["Repetitions", "complete movement", "actual set"],
    ["Set type", "warm-ups", "does not automatically split"],
    ["Maximum dumbbell weight (kg each)", "single dumbbell", "not the sum"],
  ])(
    "explains %s using a concrete meaning",
    (label, meaning, qualification) => {
      const result = describeHelpControl({ label, kind: "number" });
      expect(result.body.toLowerCase()).toContain(meaning.toLowerCase());
      expect(result.body.toLowerCase()).toContain(qualification.toLowerCase());
    },
  );

  it.each([
    ["Start Full Body A", "Begins a session", "actual weights"],
    ["Complete Bench Press set 1", "Marks this set as done", "undo"],
    ["Undo Bench Press set 1", "unfinished again", "correct"],
    ["View plan", "planned training dates", "completed session history"],
    ["View calendar", "planned training dates", "completed session history"],
    ["Workout library", "reusable workout templates", "edit a copy"],
    ["Exercise library", "movement instructions", "filter"],
    ["Today", "today's local date", "does not move"],
    ["Use defaults", "starting preferences", "Settings"],
    ["Skip for now", "optional setup", "later"],
    ["Let’s get started", "Saves your setup", "calendar"],
    ["Edit workout", "editor", "save action"],
    ["Save changes", "on this device", "saving fails"],
    ["Delete goal", "Removes", "confirmation"],
    ["Continue", "next exercise or step", "unlogged"],
    ["Close", "Closes this view", "saved first"],
    ["Duplicate template", "another copy", "original"],
  ])("explains the actual %s action", (label, action, consequence) => {
    const result = describeHelpControl({ label, kind: "button" });
    expect(result.body).toContain(action);
    expect(result.body.toLowerCase()).toContain(consequence.toLowerCase());
  });

  it("uses explicit overrides without guessing from unrelated labels", () => {
    expect(
      describeHelpControl({
        label: "Bench load",
        kind: "number",
        topic: "rir",
      }),
    ).toEqual(helpTopics.rir);
    expect(
      describeHelpControl({
        label: "Configure",
        kind: "button",
        topic: "ai",
        description: "Local-only custom action.",
      }),
    ).toEqual({ title: "Configure", body: "Local-only custom action." });
  });
  it("keeps technical meaning ahead of unrelated screen context", () => {
    expect(
      describeHelpControl({
        label: "RIR",
        kind: "number",
        context: "Nutrition",
      }),
    ).toEqual(helpTopics.rir);
    expect(
      describeHelpControl({
        label: "Starting value",
        kind: "number",
        context: "Edit goal",
      }).body,
    ).toContain("baseline when the goal began");
  });
  it.each([
    ["number", "Enter a number"],
    ["choice", "arrow keys"],
    ["toggle", "checked state"],
    ["date", "calendar date"],
    ["file", "supported formats"],
    ["disclosure", "Expands or collapses"],
  ] as [HelpControlKind, string][])(
    "provides useful behavior for unknown %s controls",
    (kind, meaning) => {
      expect(
        describeHelpControl({ label: "Future setting", kind, topic: "unknown" })
          .body,
      ).toContain(meaning);
    },
  );
  it("does not treat object prototype names as registered topics", () => {
    expect(
      describeHelpControl({
        label: "Unregistered",
        kind: "number",
        topic: "toString",
      }).body,
    ).toContain("Enter a number");
  });
  it("qualifies unavailable controls without inventing a cause", () => {
    const result = describeHelpControl({
      label: "Start workout",
      kind: "button",
      disabled: true,
    });
    expect(result.body).toContain("Begins a session");
    expect(result.body).toContain("currently unavailable");
    expect(result.body).toContain("nearby guidance");
  });
});
