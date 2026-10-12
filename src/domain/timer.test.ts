import { describe, expect, it } from "vitest";
import {
  pauseSetTimer,
  resetSetTimer,
  resumeSetTimer,
  startSetTimer,
  timerActualSeconds,
  timerElapsedMs,
  timerRemainingSeconds,
} from "./timer";

describe("timestamp set timer", () => {
  it("recovers elapsed time after reload without interval tick writes", () => {
    const saved = startSetTimer("exercise", "set", 30, "countdown", 1000);
    const restored = JSON.parse(JSON.stringify(saved));
    expect(timerElapsedMs(restored, 18000)).toBe(17000);
    expect(timerRemainingSeconds(restored, 18000)).toBe(13);
    expect(saved.elapsedMs).toBe(0);
  });
  it("excludes paused time and preserves accumulated intervals through resume", () => {
    const paused = pauseSetTimer(
      startSetTimer("exercise", "set", 30, "countdown", 1000),
      11500,
    );
    expect(timerActualSeconds(paused, 60000)).toBe(10.5);
    const resumed = resumeSetTimer(paused, 60000);
    expect(timerActualSeconds(resumed, 65000)).toBe(15.5);
    expect(resumeSetTimer(resumed, 64000).startedAt).toBe(60000);
  });
  it("retains actual overtime while countdown stays at zero, without auto-completing", () => {
    const timer = startSetTimer("exercise", "set", 30, "countdown", 1000);
    expect(timerRemainingSeconds(timer, 43000)).toBe(0);
    expect(timerActualSeconds(timer, 43000)).toBe(42);
    expect(timer).not.toHaveProperty("completed");
  });
  it("resets elapsed time but retains the set reference, mode and target", () => {
    const timer = pauseSetTimer(
      startSetTimer("exercise", "set", 30, "stopwatch", 1000),
      5000,
    );
    expect(resetSetTimer(timer)).toEqual({
      exerciseId: "exercise",
      setId: "set",
      mode: "stopwatch",
      targetSeconds: 30,
      elapsedMs: 0,
      startedAt: undefined,
    });
  });
  it("uses a stopwatch for an unset target and does not count backward clock time", () => {
    const timer = startSetTimer("exercise", "set", 0, undefined, 1000);
    expect(timer.mode).toBe("stopwatch");
    expect(timerActualSeconds(timer, 999)).toBe(0);
  });
});
