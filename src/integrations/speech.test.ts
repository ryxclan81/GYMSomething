import { describe, it, expect } from "vitest";
import { parseVoiceCommand } from "./speech";
describe("deterministic workout voice commands", () => {
  it.each([
    [
      "Log ten reps at 135 pounds.",
      { kind: "log", reps: 10, weight: 135, unit: "lb" },
    ],
    [
      "Log ten reps at one hundred thirty five pounds.",
      { kind: "log", reps: 10, weight: 135, unit: "lb" },
    ],
    [
      "I did eight reps.",
      { kind: "log", reps: 8, weight: undefined, unit: undefined },
    ],
    [
      "log 12 reps at 62.5 kilograms",
      { kind: "log", reps: 12, weight: 62.5, unit: "kg" },
    ],
    [
      "change the weight to 140",
      { kind: "weight", weight: 140, unit: undefined },
    ],
    ["start a two-minute rest", { kind: "rest", seconds: 120 }],
    ["start 1 minute 30 seconds rest", { kind: "rest", seconds: 90 }],
    ["add another set", { kind: "add-set" }],
    ["skip this exercise", { kind: "skip" }],
    ["what’s next?".replace("’", "'"), { kind: "next" }],
    ["What did I lift last time?", { kind: "history" }],
    ["How many sets are left?", { kind: "remaining" }],
    ["finish workout", { kind: "finish" }],
  ])("parses %s", (text, command) =>
    expect(parseVoiceCommand(text)).toEqual(command),
  );
  it.each([
    "buy more supplements",
    "log -10 reps",
    "start rest",
    "log 0 reps",
    "log ten reps at 50 kg pounds",
    "change the weight to 99999",
  ])("rejects ambiguous or invalid input: %s", (text) =>
    expect(parseVoiceCommand(text)).toBeNull(),
  );
});
