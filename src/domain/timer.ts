/** A running timer persists one timestamp rather than writing every tick. */
export interface SetTimer {
  exerciseId: string;
  setId: string;
  mode: "countdown" | "stopwatch";
  elapsedMs: number;
  startedAt?: number;
  targetSeconds: number;
}

export function timerElapsedMs(timer: SetTimer, now = Date.now()): number {
  const accumulated = Number.isFinite(timer.elapsedMs)
    ? Math.max(0, timer.elapsedMs)
    : 0;
  const running =
    timer.startedAt === undefined ? 0 : Math.max(0, now - timer.startedAt);
  return accumulated + running;
}
export function timerRemainingSeconds(
  timer: SetTimer,
  now = Date.now(),
): number {
  return Math.max(0, timer.targetSeconds - timerElapsedMs(timer, now) / 1000);
}
export function startSetTimer(
  exerciseId: string,
  setId: string,
  targetSeconds: number,
  mode: SetTimer["mode"] = targetSeconds > 0 ? "countdown" : "stopwatch",
  now = Date.now(),
): SetTimer {
  return {
    exerciseId,
    setId,
    mode,
    elapsedMs: 0,
    targetSeconds: Math.max(0, targetSeconds),
    startedAt: now,
  };
}
export function pauseSetTimer(timer: SetTimer, now = Date.now()): SetTimer {
  return {
    ...timer,
    elapsedMs: timerElapsedMs(timer, now),
    startedAt: undefined,
  };
}
export function resumeSetTimer(timer: SetTimer, now = Date.now()): SetTimer {
  return timer.startedAt === undefined
    ? { ...timer, startedAt: now }
    : { ...timer };
}
export function resetSetTimer(timer: SetTimer): SetTimer {
  return { ...timer, elapsedMs: 0, startedAt: undefined };
}
export function timerActualSeconds(timer: SetTimer, now = Date.now()): number {
  return Math.round(timerElapsedMs(timer, now)) / 1000;
}
