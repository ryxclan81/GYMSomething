import { HelpToggle, HelpText } from "../components/Help";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Mic,
  Music2,
  ArrowRightLeft,
  Trash2,
  ArrowRight,
  Dumbbell,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import type {
  Exercise,
  Session,
  SessionExercise,
  SetType,
  WorkoutSet,
} from "../domain/types";
import { useApp, updateData } from "../state/store";
import {
  fromKg,
  toKg,
  evaluateProgression,
  goalValue,
  sessionStats,
  substitutions,
} from "../domain/engine";
import {
  completeSession,
  makeSessionExercise,
  makeSet,
  validateSet,
} from "../domain/session";
import {
  pauseSetTimer,
  resetSetTimer,
  resumeSetTimer,
  startSetTimer,
  timerActualSeconds,
  timerElapsedMs,
  timerRemainingSeconds,
  type SetTimer,
} from "../domain/timer";
import { dateKey, formatTime, id } from "../domain/helpers";
import { Button, Field, IconButton, Sheet, toast } from "../components/ui";
import { Library } from "./Library";
import { NumericInput, Select } from "../components/inputs";
import {
  parseVoiceCommand,
  speechSupported,
  startSpeech,
} from "../integrations/speech";
import {
  openSpotify,
  spotifyAction,
  spotifyConnected,
} from "../integrations/spotify";

const setTypes: SetType[] = [
  "working",
  "warmup",
  "drop",
  "amrap",
  "failure",
  "rest-pause",
  "myo-reps",
  "assisted",
  "timed",
  "custom",
];
const setTypeLabels: Record<SetType, string> = {
  working: "Working",
  warmup: "Warm-up",
  drop: "Drop set",
  amrap: "AMRAP",
  failure: "To failure",
  "rest-pause": "Rest pause",
  "myo-reps": "Myo reps",
  assisted: "Assisted",
  timed: "Timed",
  custom: "Custom",
};
const loadLabels: Record<Exercise["load"], string> = {
  total: "Log the total external load",
  "per-hand": "Log the load of one dumbbell",
  machine: "Log the machine-stack load",
  added: "Log added weight, excluding bodyweight",
  assistance: "Log assistance weight; less assistance is progress",
  none: "Track repetitions without external load",
};
function MuscleLabels({ exercise }: { exercise: Exercise }) {
  return (
    <span className="workout-muscles">
      <span className="workout-muscle-line primary">
        <span className="muscle-label">Primary</span>
        <span>
          {exercise.primary.length
            ? exercise.primary.join(" · ")
            : "Not specified"}
        </span>
      </span>
      <span className="workout-muscle-line secondary">
        <span className="muscle-label">Secondary</span>
        <span>
          {exercise.secondary.length
            ? exercise.secondary.join(" · ")
            : "None listed"}
        </span>
      </span>
    </span>
  );
}
export default function Workout({
  session: supplied,
  onBack,
  onComplete,
  history = false,
  onFocusChange,
}: {
  session: Session;
  onBack: () => void;
  onComplete: (session: Session) => void;
  history?: boolean;
  onFocusChange?: (focused: boolean) => void;
}) {
  const { data } = useApp();
  const session = history
    ? (data.sessions.find((s) => s.id === supplied.id) ?? supplied)
    : (data.activeSession ?? supplied);
  const [now, setNow] = useState(Date.now());
  const [add, setAdd] = useState(false),
    [finish, setFinish] = useState(false),
    [actions, setActions] = useState<string | null>(null),
    [replace, setReplace] = useState<string | null>(null),
    [technique, setTechnique] = useState(false);
  const [voice, setVoice] = useState(false),
    [command, setCommand] = useState(""),
    [listening, setListening] = useState(false),
    [music, setMusic] = useState(false);
  const [notes, setNotes] = useState(session.notes),
    [difficulty, setDifficulty] = useState(session.difficulty ?? 5),
    [annotation, setAnnotation] = useState(session.annotation ?? "");
  const speechStop = useRef<(() => void) | null>(null);
  const rang = useRef(false);
  const timedRang = useRef<string | null>(null);
  const focused = session.exercises.find(
    (e) => e.id === session.focusedExerciseId,
  );
  const focusedIndex = focused
    ? session.exercises.findIndex((e) => e.id === focused.id)
    : -1;
  const isFocused = Boolean(focused);
  useEffect(() => {
    onFocusChange?.(isFocused);
    window.scrollTo({ top: 0, behavior: "instant" });
    document
      .querySelector(".app-content")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [isFocused, onFocusChange]);
  useEffect(() => () => onFocusChange?.(false), [onFocusChange]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => () => {
      speechStop.current?.();
    },
    [],
  );
  const rest = session.restEndsAt
    ? Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000))
    : (session.restPausedSeconds ?? 0);
  const activeSetTimer = history ? undefined : session.setTimer;
  useEffect(() => {
    if (
      activeSetTimer?.startedAt !== undefined &&
      activeSetTimer.mode === "countdown" &&
      activeSetTimer.targetSeconds > 0 &&
      timerRemainingSeconds(activeSetTimer, now) === 0 &&
      timedRang.current !== activeSetTimer.setId
    ) {
      timedRang.current = activeSetTimer.setId;
      toast("Target time reached. Finish the set when you stop.");
      navigator.vibrate?.(80);
    }
    if (!activeSetTimer || timerRemainingSeconds(activeSetTimer, now) > 0)
      timedRang.current = null;
  }, [activeSetTimer, now]);
  useEffect(() => {
    if (session.restEndsAt && rest === 0 && !rang.current) {
      rang.current = true;
      toast("Rest complete. Ready when you are.");
      navigator.vibrate?.([100, 80, 100]);
    }
    if (rest > 0) rang.current = false;
  }, [rest, session.restEndsAt]);
  function edit(change: (s: Session) => void) {
    return updateData((d) => {
      const target = history
        ? d.sessions.find((s) => s.id === session.id)
        : d.activeSession;
      if (target) {
        change(target);
        const timer = target.setTimer;
        if (
          timer &&
          !target.exercises.some(
            (exercise) =>
              exercise.id === timer.exerciseId &&
              exercise.sets.some(
                (set) =>
                  set.id === timer.setId && !set.completed && !set.skipped,
              ),
          )
        )
          target.setTimer = undefined;
      }
    }).catch(() => {});
  }
  function focusExercise(exerciseId?: string) {
    setTechnique(false);
    void edit((s) => {
      s.focusedExerciseId = exerciseId;
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function updateSet(eid: string, sid: string, patch: Partial<WorkoutSet>) {
    for (const field of [
      "weightKg",
      "reps",
      "durationSeconds",
      "distanceKm",
      "rir",
      "rpe",
    ] as const) {
      const value = patch[field];
      if (value !== undefined) {
        const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
        patch[field] =
          field === "reps"
            ? Math.floor(safe)
            : field === "rir" || field === "rpe"
              ? Math.min(10, safe)
              : safe;
      }
    }
    void edit((s) => {
      const set = s.exercises
        .find((e) => e.id === eid)
        ?.sets.find((x) => x.id === sid);
      if (set) Object.assign(set, patch);
    });
  }
  const remaining = session.exercises
    .flatMap((e) => e.sets)
    .filter((s) => !s.completed && !s.skipped).length;
  const current =
    focused ??
    session.exercises.find((e) =>
      e.sets.some((s) => !s.completed && !s.skipped),
    ) ??
    session.exercises.at(-1);
  function toggleSet(exercise: SessionExercise, set: WorkoutSet) {
    const timer =
      !set.completed &&
      activeSetTimer?.exerciseId === exercise.id &&
      activeSetTimer.setId === set.id
        ? activeSetTimer
        : undefined;
    const actualSet = timer
      ? { ...set, durationSeconds: timerActualSeconds(timer) }
      : set;
    if (!set.completed) {
      const error = validateSet(actualSet, exercise.exercise);
      if (error) {
        toast(error);
        return;
      }
    }
    void edit((s) => {
      const target = s.exercises
        .find((e) => e.id === exercise.id)
        ?.sets.find((x) => x.id === set.id);
      if (!target) return;
      if (timer) {
        target.durationSeconds = actualSet.durationSeconds;
        s.setTimer = undefined;
      }
      target.completed = !target.completed;
      target.skipped = false;
      target.completedAt = target.completed
        ? new Date().toISOString()
        : undefined;
      if (target.completed && !history) {
        const group = exercise.prescription.group;
        const groupExercises = group
          ? s.exercises.filter((e) => e.prescription.group === group)
          : [];
        const round = exercise.sets.findIndex((x) => x.id === set.id);
        const groupRoundDone =
          !group ||
          groupExercises.every(
            (e) =>
              e.sets[round]?.completed ||
              e.sets[round]?.skipped ||
              !e.sets[round],
          );
        if (groupRoundDone) {
          s.restEndsAt = Date.now() + exercise.prescription.restSeconds * 1000;
          s.restPausedSeconds = undefined;
        }
        if (
          s.focusedExerciseId === exercise.id &&
          s.exercises
            .find((entry) => entry.id === exercise.id)
            ?.sets.every((item) => item.completed || item.skipped)
        ) {
          s.focusedExerciseId = undefined;
        }
      }
    });
    if (!set.completed && data.profile.celebrations) navigator.vibrate?.(20);
  }
  function addExercise(exercise: Exercise) {
    void edit((s) => {
      s.exercises.push(makeSessionExercise(exercise));
      s.focusedExerciseId = undefined;
    });
    setAdd(false);
    toast(`${exercise.name} added`);
  }
  function replaceExercise(exercise: Exercise) {
    void edit((s) => {
      const i = s.exercises.findIndex((e) => e.id === replace);
      if (i < 0) return;
      const previous = s.exercises[i];
      if (previous.sets.some((x) => x.completed)) {
        toast(
          "Completed sets stay in history. Add the substitute as a new exercise.",
        );
        const replacement = makeSessionExercise(exercise);
        s.exercises.push(replacement);
        if (s.focusedExerciseId === previous.id)
          s.focusedExerciseId = replacement.id;
      } else {
        const p = {
          ...previous.prescription,
          exerciseId: exercise.id,
          weightKg: 0,
          id: id(),
        };
        const replacement = makeSessionExercise(exercise, p);
        replacement.originalExerciseId = previous.exerciseId;
        s.exercises[i] = replacement;
        if (s.focusedExerciseId === previous.id)
          s.focusedExerciseId = replacement.id;
      }
    });
    setReplace(null);
    toast("Substitution saved for this session. Load starts at zero.");
  }
  async function save() {
    if (
      activeSetTimer &&
      (activeSetTimer.startedAt !== undefined ||
        timerElapsedMs(activeSetTimer) > 0)
    ) {
      toast(
        "Finish or reset your current set timer before saving the workout.",
      );
      const entry = session.exercises.find(
        (exercise) => exercise.id === activeSetTimer.exerciseId,
      );
      if (entry) focusExercise(entry.id);
      setFinish(false);
      return;
    }
    if (
      !session.exercises.some((e) =>
        e.sets.some((s) => s.completed && !s.skipped),
      )
    ) {
      toast("Complete at least one set before saving.");
      return;
    }
    for (const e of session.exercises) {
      for (const set of e.sets.filter((x) => x.completed && !x.skipped)) {
        const error = validateSet(set, e.exercise);
        if (error) {
          toast(`${e.exercise.name}: ${error}`);
          return;
        }
      }
    }
    try {
      let completed: Session | undefined;
      await updateData((d) => {
        const s = history
          ? d.sessions.find((s) => s.id === session.id)
          : d.activeSession;
        if (!s) return;
        s.notes = notes;
        s.difficulty = difficulty;
        s.annotation = annotation;
        s.setTimer = undefined;
        const isNew = completeSession(d, s);
        completed = d.sessions.find((x) => x.id === s.id);
        if (!isNew) {
          const editedIds = new Set(s.exercises.map((e) => e.exerciseId));
          for (const suggestion of d.suggestions) {
            if (
              editedIds.has(suggestion.exerciseId) &&
              ["pending", "snoozed"].includes(suggestion.status)
            ) {
              suggestion.status = "dismissed";
              suggestion.reason +=
                " Historical session was corrected; this suggestion was recalculated.";
            }
          }
        }
        {
          for (const e of s.exercises) {
            const rule = e.prescription.rule ?? d.profile.progression;
            const suggestion = evaluateProgression(
              e.exercise,
              e.prescription,
              d.sessions,
              rule,
            );
            if (
              suggestion &&
              !d.suggestions.some(
                (x) =>
                  x.exerciseId === suggestion.exerciseId &&
                  x.status === "pending",
              )
            ) {
              suggestion.templateId = s.templateId;
              d.suggestions.push(suggestion);
            }
          }
          for (const g of d.goals) {
            const value = goalValue(g, d);
            if (isNew || value !== g.current) {
              g.current = value;
              g.history.push({ date: dateKey(), value });
            }
          }
        }
      });
      if (completed) onComplete(completed);
    } catch {
      toast("Your workout could not be saved. Export a backup in Settings.");
    }
  }
  function runCommand(raw: string) {
    const parsed = parseVoiceCommand(raw);
    if (!parsed) {
      toast("Command not recognized. Try “log 10 reps at 40 pounds”.");
      return;
    }
    const e = current;
    const set = e?.sets.find((x) => !x.completed && !x.skipped);
    if (parsed.kind === "finish") {
      setFinish(true);
      return;
    }
    if (parsed.kind === "rest") {
      void edit((s) => {
        s.restEndsAt = Date.now() + parsed.seconds * 1000;
        s.restPausedSeconds = undefined;
      });
      return;
    }
    if (parsed.kind === "remaining") {
      toast(`${remaining} sets remaining.`);
      return;
    }
    if (parsed.kind === "next") {
      const next =
        focusedIndex >= 0 ? session.exercises[focusedIndex + 1] : current;
      if (next) focusExercise(next.id);
      else
        toast(
          "You have reached the last exercise. Review your session or finish when ready.",
        );
      return;
    }
    if (parsed.kind === "history") {
      const prior = [...data.sessions]
        .reverse()
        .flatMap((s) => s.exercises)
        .find((x) => x.exerciseId === e?.exerciseId);
      toast(
        prior
          ? prior.sets
              .filter((x) => x.completed)
              .map(
                (x) =>
                  `${Math.round(fromKg(x.weightKg, data.profile.unit) * 10) / 10} ${data.profile.unit} × ${x.reps}`,
              )
              .join(" · ")
          : "No previous performance for this exercise.",
      );
      return;
    }
    if (!e) {
      toast("Add an exercise first.");
      return;
    }
    if (parsed.kind === "add-set") {
      void edit((s) => {
        s.exercises
          .find((x) => x.id === e.id)
          ?.sets.push(makeSet(e.prescription, e.sets.at(-1)));
      });
      return;
    }
    if (parsed.kind === "skip") {
      setActions(e.id);
      toast("Use Skip unfinished sets to confirm.");
      return;
    }
    if (!set) {
      toast("All sets are complete. Add a set to continue.");
      return;
    }
    if (parsed.kind === "weight") {
      updateSet(e.id, set.id, {
        weightKg: toKg(parsed.weight, parsed.unit ?? data.profile.unit),
      });
      toast("Weight updated.");
      return;
    }
    if (parsed.kind === "log") {
      const next = {
        ...set,
        reps: parsed.reps ?? set.reps,
        weightKg:
          parsed.weight === undefined
            ? set.weightKg
            : toKg(parsed.weight, parsed.unit ?? data.profile.unit),
      };
      const error = validateSet(next, e.exercise);
      if (error) {
        toast(error);
        return;
      }
      updateSet(e.id, set.id, { reps: next.reps, weightKg: next.weightKg });
      toggleSet(e, next);
      toast("Set logged. Tap its checkmark to undo.");
    }
  }
  const stats = sessionStats(session);
  const selected = session.exercises.find((e) => e.id === actions);
  const replaceItem = session.exercises.find((e) => e.id === replace);
  const equipment = data.equipment.find(
    (e) => e.id === data.activeEquipmentId,
  )!;
  return (
    <div
      className={`page workout-page ${focused ? "workout-focused" : "workout-overview"}`}
    >
      {focused ? (
        <>
          <header className="focus-topbar">
            <button className="focus-back" onClick={() => focusExercise()}>
              <ArrowLeft size={20} /> All exercises
            </button>
            <span className="eyebrow">
              {String(focusedIndex + 1).padStart(2, "0")} /{" "}
              {String(session.exercises.length).padStart(2, "0")}
            </span>
            <span className="elapsed">
              {formatTime(
                (new Date(session.completedAt ?? now).getTime() -
                  new Date(session.startedAt).getTime()) /
                  1000,
              )}
            </span>
            <HelpToggle compact className="icon-btn" />
          </header>
          <div className="focus-session-label">
            <span className="eyebrow">
              {history ? "EDITING SAVED SESSION" : "TODAY’S SESSION"}
            </span>
            <span>{session.name}</span>
          </div>
          <section className="focus-hero">
            <div className="row between">
              <span className="eyebrow">
                {focused.exercise.category}{" "}
                {focused.prescription.group &&
                  `/ ${focused.prescription.group}`}
              </span>
              <IconButton
                label={`Options for ${focused.exercise.name}`}
                onClick={() => setActions(focused.id)}
              >
                <MoreHorizontal size={22} />
              </IconButton>
            </div>
            <h1 className="workout-focus-title">{focused.exercise.name}</h1>
            <MuscleLabels exercise={focused.exercise} />
            <div className="focus-prescription">
              <div>
                <span>PLANNED SETS</span>
                <strong>{focused.prescription.sets}</strong>
              </div>
              <div>
                <span>
                  {focused.exercise.measurement === "cardio" ||
                  focused.exercise.measurement === "duration"
                    ? "TARGET TIME"
                    : "REP TARGET"}
                </span>
                <strong>
                  {focused.exercise.measurement === "cardio" ||
                  focused.exercise.measurement === "duration"
                    ? formatTime(focused.prescription.durationSeconds)
                    : `${focused.prescription.repMin}–${focused.prescription.repMax}`}
                </strong>
              </div>
              <div>
                <span>REST</span>
                <strong>
                  {focused.prescription.restSeconds}
                  <small> sec</small>
                </strong>
              </div>
            </div>
            <div className="focus-guide-line">
              <span className="muted">
                {focused.exercise.measurement === "cardio"
                  ? "Track duration and distance"
                  : focused.exercise.measurement === "duration"
                    ? "Track your hold duration in seconds"
                    : loadLabels[focused.exercise.load]}
              </span>
              <button className="text-btn" onClick={() => setTechnique(true)}>
                <BookOpen size={15} /> Technique
              </button>
            </div>
            {focused.prescription.notes && (
              <p className="focus-cue">{focused.prescription.notes}</p>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="workout-top">
            <IconButton label="Back to Train" onClick={onBack}>
              <ArrowLeft size={22} />
            </IconButton>
            <span className="eyebrow">
              {history ? "EDIT WORKOUT" : "SESSION IN PROGRESS"}
            </span>
            <span className="elapsed">
              {formatTime(
                (new Date(session.completedAt ?? now).getTime() -
                  new Date(session.startedAt).getTime()) /
                  1000,
              )}
            </span>
          </div>
          <h1 className="workout-title">{session.name}</h1>
          <div className="row muted workout-meta">
            <span>{stats.sets} sets completed</span>
            <span>·</span>
            <span>{remaining} remaining</span>
          </div>
          {session.exercises.length > 0 && (
            <section
              className="workout-overview-list"
              aria-label="Today's exercise overview"
            >
              <div className="section-heading">
                <h2>Your exercises</h2>
                <span className="muted small">Tap a movement to log sets</span>
              </div>
              {session.exercises.map((entry, index) => {
                const completed = entry.sets.filter(
                  (s) => s.completed && !s.skipped,
                ).length;
                const unfinished = entry.sets.filter(
                  (s) => !s.completed && !s.skipped,
                ).length;
                const skipped =
                  entry.sets.length > 0 && entry.sets.every((s) => s.skipped);
                const done = completed > 0 && unfinished === 0;
                const timed =
                  entry.exercise.measurement === "duration" ||
                  entry.exercise.measurement === "cardio";
                return (
                  <button
                    className={`workout-overview-card ${done ? "done" : ""} ${skipped ? "skipped" : ""}`}
                    key={entry.id}
                    aria-label={`Open ${entry.exercise.name}`}
                    onClick={() => focusExercise(entry.id)}
                  >
                    <span className="overview-exercise-number">
                      {done ? (
                        <Check size={18} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="overview-exercise-body">
                      <span className="overview-exercise-status">
                        <span className="eyebrow">
                          {entry.prescription.group || entry.exercise.category}
                        </span>
                        <span>
                          {skipped
                            ? "Skipped"
                            : done
                              ? "Complete"
                              : completed > 0
                                ? `${completed}/${entry.sets.length} sets logged`
                                : "Ready"}
                        </span>
                      </span>
                      <strong>{entry.exercise.name}</strong>
                      <MuscleLabels exercise={entry.exercise} />
                      <span className="overview-exercise-target">
                        {entry.sets.length} sets <i />{" "}
                        {timed
                          ? `${formatTime(entry.prescription.durationSeconds)} target`
                          : `${entry.prescription.repMin}–${entry.prescription.repMax} reps`}{" "}
                        <i /> {entry.prescription.restSeconds}s rest
                      </span>
                    </span>
                    <ChevronRight size={19} />
                  </button>
                );
              })}
            </section>
          )}
        </>
      )}
      {!history && rest > 0 && (
        <div className="rest-dock">
          <span className="eyebrow">REST</span>
          <strong>{formatTime(rest)}</strong>
          <button
            className="text-btn"
            onClick={() => {
              void edit((s) => {
                if (s.restEndsAt) {
                  s.restPausedSeconds = rest;
                  s.restEndsAt = undefined;
                } else {
                  s.restEndsAt = Date.now() + rest * 1000;
                  s.restPausedSeconds = undefined;
                }
              });
            }}
          >
            {session.restEndsAt ? "Pause" : "Resume"}
          </button>
          <button
            className="text-btn"
            onClick={() => {
              void edit((s) => {
                s.restEndsAt = undefined;
                s.restPausedSeconds = undefined;
              });
            }}
          >
            Skip rest
          </button>
        </div>
      )}
      {session.exercises.length === 0 && (
        <div className="empty">
          <h2>Your session, your pace.</h2>
          <p className="muted">Add your first exercise to begin logging.</p>
        </div>
      )}
      {activeSetTimer && activeSetTimer.exerciseId !== focused?.id && (
        <div className="hold-timer">
          <div className="hold-timer-display">
            <span className="small">
              Set timer ·{" "}
              {
                session.exercises.find(
                  (exercise) => exercise.id === activeSetTimer.exerciseId,
                )?.exercise.name
              }
            </span>
            <strong>
              {formatTime(timerElapsedMs(activeSetTimer, now) / 1000)}
            </strong>
          </div>
          <Button
            variant="secondary"
            onClick={() => focusExercise(activeSetTimer.exerciseId)}
          >
            Return to timer
          </Button>
        </div>
      )}
      {session.exercises
        .filter((entry) => entry.id === focused?.id)
        .map((entry) => {
          const ex = entry.exercise;
          const timed =
            ex.measurement === "duration" || ex.measurement === "cardio";
          const cardio = ex.measurement === "cardio";
          const loaded = !timed && ex.load !== "none";
          const pendingSet = entry.sets.findIndex(
            (set) => !set.completed && !set.skipped,
          );
          const previous = [...data.sessions]
            .reverse()
            .filter((s) => s.id !== session.id)
            .flatMap((s) => s.exercises)
            .find((e) => e.exerciseId === entry.exerciseId);
          return (
            <section className="exercise-log" key={entry.id}>
              <header className="exercise-log-header">
                <div>
                  <span className="eyebrow">
                    EXERCISE {String(focusedIndex + 1).padStart(2, "0")}{" "}
                    {entry.prescription.group &&
                      `· ${entry.prescription.group}`}
                  </span>
                  <h2>Your sets</h2>
                  <p className="muted small">
                    {timed
                      ? `${formatTime(entry.prescription.durationSeconds)} target`
                      : `${entry.prescription.repMin}–${entry.prescription.repMax} reps`}{" "}
                    · {entry.prescription.restSeconds}s rest{" "}
                    {loaded &&
                      `· ${ex.load === "per-hand" ? "per dumbbell" : ex.load === "added" ? "added load" : ex.load === "assistance" ? "assistance" : ex.load === "machine" ? "machine stack" : "total load"}`}
                  </p>
                </div>
              </header>
              {previous && (
                <div className="previous">
                  <span>LAST TIME</span>{" "}
                  {previous.sets
                    .filter(
                      (s) => s.completed && !s.skipped && s.type !== "warmup",
                    )
                    .map((s) =>
                      timed
                        ? formatTime(s.durationSeconds)
                        : `${loaded ? `${Math.round(fromKg(s.weightKg, data.profile.unit) * 10) / 10} × ` : ""}${s.reps}`,
                    )
                    .join(" / ")}
                </div>
              )}
              <div
                className={`set-grid set-head ${!loaded && !cardio ? "set-basic" : ""} ${data.profile.effort !== "none" && !timed ? "with-effort" : ""}`}
              >
                <span>SET</span>
                <span>
                  {timed
                    ? cardio
                      ? "MIN"
                      : "SECONDS"
                    : loaded
                      ? data.profile.unit.toUpperCase()
                      : "REPS"}
                </span>
                {(loaded || cardio) && <span>{cardio ? "KM" : "REPS"}</span>}
                {data.profile.effort !== "none" && !timed && (
                  <span>
                    <HelpText
                      topic={data.profile.effort === "rpe" ? "rpe" : "rir"}
                    >
                      {data.profile.effort === "rpe" ? "RPE" : "RIR"}
                    </HelpText>
                  </span>
                )}
                <span className="sr-only">Complete</span>
              </div>
              {entry.sets.map((set, si) => (
                <div
                  key={set.id}
                  className={timed ? "timed-set-block" : undefined}
                >
                  <div
                    className={`set-grid ${!loaded && !cardio ? "set-basic" : ""} ${set.completed ? "set-complete" : ""} ${set.skipped ? "set-skipped" : ""} ${si === pendingSet ? "set-current" : ""} ${data.profile.effort !== "none" && !timed ? "with-effort" : ""}`}
                  >
                    <button
                      className="set-number"
                      aria-label={`Edit set ${si + 1} type for ${ex.name}`}
                      onClick={() => {
                        setActions(entry.id);
                      }}
                    >
                      {set.type === "warmup" ? "W" : si + 1}
                    </button>
                    <NumericInput
                      aria-label={`${ex.name} set ${si + 1} ${timed ? (cardio ? "minutes" : "duration in seconds") : loaded ? "weight" : "reps"}`}
                      inputMode="decimal"
                      min="0"
                      step={cardio || loaded ? 0.1 : 1}
                      value={
                        timed
                          ? cardio
                            ? Math.round((set.durationSeconds / 60) * 100) / 100
                            : set.durationSeconds
                          : loaded
                            ? Math.round(
                                fromKg(set.weightKg, data.profile.unit) * 100,
                              ) / 100
                            : set.reps
                      }
                      onChange={(event) =>
                        updateSet(
                          entry.id,
                          set.id,
                          timed
                            ? {
                                durationSeconds: Math.max(
                                  0,
                                  Number(event.target.value) *
                                    (cardio ? 60 : 1),
                                ),
                              }
                            : loaded
                              ? {
                                  weightKg: toKg(
                                    Math.max(0, Number(event.target.value)),
                                    data.profile.unit,
                                  ),
                                }
                              : {
                                  reps: Math.max(0, Number(event.target.value)),
                                },
                        )
                      }
                    />
                    {cardio ? (
                      <NumericInput
                        aria-label={`${ex.name} set ${si + 1} distance in kilometers`}
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={set.distanceKm}
                        onChange={(event) =>
                          updateSet(entry.id, set.id, {
                            distanceKm: Number(event.target.value),
                          })
                        }
                      />
                    ) : loaded ? (
                      <NumericInput
                        aria-label={`${ex.name} set ${si + 1} reps`}
                        inputMode="numeric"
                        min="0"
                        step={1}
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(entry.id, set.id, {
                            reps: Number(event.target.value),
                          })
                        }
                      />
                    ) : null}
                    {data.profile.effort !== "none" && !timed && (
                      <NumericInput
                        aria-label={`${ex.name} set ${si + 1} ${data.profile.effort === "rpe" ? "RPE" : "RIR"}`}
                        inputMode="decimal"
                        min="0"
                        max="10"
                        step={0.5}
                        placeholder="—"
                        value={
                          (data.profile.effort === "rpe" ? set.rpe : set.rir) ??
                          ""
                        }
                        onChange={(event) =>
                          updateSet(
                            entry.id,
                            set.id,
                            data.profile.effort === "rpe"
                              ? {
                                  rpe:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                }
                              : {
                                  rir:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                },
                          )
                        }
                      />
                    )}
                    <button
                      className="set-check"
                      aria-label={`${set.completed ? "Undo" : "Complete"} ${ex.name} set ${si + 1}`}
                      aria-pressed={set.completed}
                      onClick={() => toggleSet(entry, set)}
                    >
                      {set.skipped ? (
                        <SkipForward size={17} />
                      ) : (
                        <Check size={20} />
                      )}
                    </button>
                  </div>
                  {!["working", "timed"].includes(set.type) && (
                    <p className="set-type-note">{setTypeLabels[set.type]}</p>
                  )}
                  {timed &&
                    !history &&
                    !set.completed &&
                    !set.skipped &&
                    (si === pendingSet || activeSetTimer?.setId === set.id) && (
                      <SetTimerControls
                        name={`${ex.name} set ${si + 1}`}
                        now={now}
                        targetSeconds={entry.prescription.durationSeconds}
                        timer={
                          activeSetTimer?.setId === set.id
                            ? activeSetTimer
                            : undefined
                        }
                        blocked={Boolean(
                          activeSetTimer && activeSetTimer.setId !== set.id,
                        )}
                        onChange={(timer) => {
                          void edit((s) => {
                            s.setTimer =
                              timer.startedAt === undefined &&
                              timer.elapsedMs === 0
                                ? undefined
                                : timer;
                          });
                        }}
                        onStart={(mode) => {
                          void edit((s) => {
                            s.setTimer = startSetTimer(
                              entry.id,
                              set.id,
                              entry.prescription.durationSeconds,
                              mode,
                            );
                            const target = s.exercises
                              .find((exercise) => exercise.id === entry.id)
                              ?.sets.find((item) => item.id === set.id);
                            if (target?.type === "working")
                              target.type = "timed";
                            s.restEndsAt = undefined;
                            s.restPausedSeconds = undefined;
                          });
                        }}
                        onFinish={() => toggleSet(entry, set)}
                      />
                    )}
                </div>
              ))}
              <div className="set-footer">
                <button
                  className="text-btn"
                  onClick={() => {
                    void edit((s) => {
                      const e = s.exercises.find((x) => x.id === entry.id);
                      e?.sets.push(
                        makeSet(entry.prescription, entry.sets.at(-1)),
                      );
                    });
                  }}
                >
                  <Plus size={16} /> Add set
                </button>
                <input
                  aria-label={`Notes for ${ex.name}`}
                  placeholder="Add an exercise note…"
                  value={entry.notes}
                  onChange={(e) => {
                    void edit((s) => {
                      const target = s.exercises.find((x) => x.id === entry.id);
                      if (target) target.notes = e.target.value;
                    });
                  }}
                />
              </div>
              {data.profile.effort === "both" && !timed && (
                <div className="row small muted workout-rpe-fields">
                  <span>
                    <HelpText topic="rpe">RPE (optional)</HelpText>:
                  </span>
                  {entry.sets.map((set, si) => (
                    <NumericInput
                      className="mini-input"
                      key={set.id}
                      aria-label={`${ex.name} set ${si + 1} RPE`}
                      min="0"
                      max="10"
                      step={0.5}
                      inputMode="decimal"
                      placeholder="—"
                      value={set.rpe ?? ""}
                      onChange={(event) =>
                        updateSet(entry.id, set.id, {
                          rpe:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      {!focused && (
        <Button
          variant="secondary"
          className="full"
          onClick={() => setAdd(true)}
        >
          <Plus size={18} /> Add exercise
        </Button>
      )}
      {!history && (
        <div className="rest-panel">
          <div>
            <span className="eyebrow">
              {rest > 0 ? "RECOVER" : "REST TIMER"}
            </span>
            <strong className="timer-number" aria-live="off">
              {formatTime(rest)}
            </strong>
            <span className="muted small">
              {rest === 0
                ? "Ready for your next set"
                : session.restPausedSeconds !== undefined
                  ? "Paused"
                  : "Breathe. Reset. Go again."}
            </span>
          </div>
          <div className="rest-controls">
            <button
              className="timer-adjust"
              aria-label="Reduce rest by 30 seconds"
              onClick={() => {
                void edit((s) => {
                  if (s.restEndsAt)
                    s.restEndsAt = Math.max(Date.now(), s.restEndsAt - 30000);
                  else
                    s.restPausedSeconds = Math.max(
                      0,
                      (s.restPausedSeconds ?? data.profile.restSeconds) - 30,
                    );
                });
              }}
            >
              −30
            </button>
            <IconButton
              label={
                session.restEndsAt && rest > 0
                  ? "Pause rest timer"
                  : "Start rest timer"
              }
              onClick={() => {
                void edit((s) => {
                  if (s.restEndsAt && rest > 0) {
                    s.restPausedSeconds = rest;
                    s.restEndsAt = undefined;
                  } else {
                    s.restEndsAt =
                      Date.now() +
                      (s.restPausedSeconds ?? data.profile.restSeconds) * 1000;
                    s.restPausedSeconds = undefined;
                  }
                });
              }}
            >
              {session.restEndsAt && rest > 0 ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </IconButton>
            <button
              className="timer-adjust"
              aria-label="Increase rest by 30 seconds"
              onClick={() => {
                void edit((s) => {
                  if (s.restEndsAt)
                    s.restEndsAt = Math.max(Date.now(), s.restEndsAt) + 30000;
                  else
                    s.restPausedSeconds =
                      (s.restPausedSeconds ?? data.profile.restSeconds) + 30;
                });
              }}
            >
              +30
            </button>
            <IconButton
              label="Reset rest timer"
              onClick={() => {
                void edit((s) => {
                  s.restEndsAt = undefined;
                  s.restPausedSeconds = data.profile.restSeconds;
                });
              }}
            >
              <RotateCcw size={18} />
            </IconButton>
          </div>
        </div>
      )}
      <div className="row workout-tools">
        {data.profile.voice && (
          <Button variant="ghost" onClick={() => setVoice(true)}>
            <Mic size={18} /> Voice
          </Button>
        )}
        {data.profile.spotify && (
          <Button variant="ghost" onClick={() => setMusic(!music)}>
            <Music2 size={18} /> Music
          </Button>
        )}
      </div>
      {music && (
        <div className="surface row wrap">
          <span className="small muted">
            {spotifyConnected()
              ? "Spotify connected"
              : "Spotify Premium controls need a configured connection."}
          </span>
          {spotifyConnected() ? (
            (["previous", "play", "pause", "next"] as const).map((action) => (
              <button
                className="btn ghost"
                key={action}
                onClick={() => {
                  spotifyAction(action).catch((e) => toast(e.message));
                }}
              >
                {action}
              </button>
            ))
          ) : (
            <Button variant="secondary" onClick={openSpotify}>
              Open Spotify
            </Button>
          )}
        </div>
      )}
      {!focused && (
        <Button className="full finish-workout" onClick={() => setFinish(true)}>
          {history ? "Save corrections" : "Finish workout"} <Check size={18} />
        </Button>
      )}
      {focused && (
        <nav className="focus-navigation" aria-label="Exercise navigation">
          <button
            className="focus-previous"
            disabled={focusedIndex === 0}
            onClick={() =>
              focusExercise(session.exercises[focusedIndex - 1]?.id)
            }
            aria-label="Previous exercise"
          >
            <ArrowLeft size={20} />
          </button>
          {focusedIndex < session.exercises.length - 1 ? (
            <button
              className="focus-next"
              onClick={() =>
                focusExercise(session.exercises[focusedIndex + 1].id)
              }
              aria-label="Next exercise"
            >
              <span>
                <small>UP NEXT</small>
                <strong>
                  {session.exercises[focusedIndex + 1].exercise.name}
                </strong>
              </span>
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              className="focus-next"
              onClick={() => focusExercise()}
              aria-label="Back to all exercises"
            >
              <span>
                <small>SESSION OVERVIEW</small>
                <strong>Back to all exercises</strong>
              </span>
              <Dumbbell size={20} />
            </button>
          )}
          <button
            className="focus-finish"
            aria-label={history ? "Save corrections" : "Finish workout"}
            onClick={() => setFinish(true)}
          >
            <Check size={18} />
            <span>{history ? "Save" : "Finish"}</span>
          </button>
        </nav>
      )}
      {!history && !focused && (
        <Button
          variant="ghost"
          className="full"
          onClick={() => {
            if (
              window.confirm(
                "Discard this active workout and its sets? Completed workout history will stay saved.",
              )
            ) {
              void updateData((d) => {
                if (d.activeSession?.id === session.id) d.activeSession = null;
              })
                .then(onBack)
                .catch(() => toast("Could not discard the session."));
            }
          }}
        >
          Discard workout
        </Button>
      )}
      {add && (
        <Sheet title="Add an exercise" onClose={() => setAdd(false)}>
          <Library onPick={addExercise} />
        </Sheet>
      )}
      {technique && focused && (
        <Sheet
          title={`${focused.exercise.name} · technique`}
          onClose={() => setTechnique(false)}
        >
          <div className="stack">
            <MuscleLabels exercise={focused.exercise} />
            <p className="muted">{focused.exercise.description}</p>
            {focused.exercise.media &&
              (focused.exercise.media.startsWith("data:video") ? (
                <video
                  className="workout-technique-media"
                  src={focused.exercise.media}
                  controls
                  playsInline
                />
              ) : (
                <img
                  className="workout-technique-media"
                  src={focused.exercise.media}
                  alt={`Demonstration of ${focused.exercise.name}`}
                  loading="lazy"
                />
              ))}
            <h3>Setup and execution</h3>
            {focused.exercise.instructions.length > 0 ? (
              <ol className="instruction-list">
                {focused.exercise.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                No instructions saved for this custom movement. Add your
                personal technique cues in the exercise library.
              </p>
            )}
            {focused.exercise.mistakes.length > 0 && (
              <>
                <h3>Technique cues</h3>
                <ul className="instruction-list">
                  {focused.exercise.mistakes.map((mistake, index) => (
                    <li key={index}>{mistake}</li>
                  ))}
                </ul>
              </>
            )}
            {focused.exercise.safety && (
              <p className="fine-print">{focused.exercise.safety}</p>
            )}
            <p className="fine-print">
              {focused.exercise.source} · {focused.exercise.license}
            </p>
          </div>
        </Sheet>
      )}
      {finish && (
        <Sheet
          title={history ? "Save workout corrections" : "You showed up."}
          onClose={() => setFinish(false)}
        >
          <p className="muted">
            {stats.sets} completed sets · {stats.reps} reps ·{" "}
            {Math.round(
              fromKg(stats.volume, data.profile.unit),
            ).toLocaleString()}{" "}
            {data.profile.unit} external volume
          </p>
          <p className="small muted">
            Unfinished sets are retained in your history and excluded from
            totals.
          </p>
          <Field label="Workout name">
            <input
              value={session.name}
              onChange={(e) => {
                void edit((s) => {
                  s.name = e.target.value.slice(0, 100);
                });
              }}
            />
          </Field>
          <Field label="Session note">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
            />
          </Field>
          <Field label="Session difficulty (1–10)">
            <input
              type="range"
              min="1"
              max="10"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
            <span>{difficulty}/10</span>
          </Field>
          <Field label="Context">
            <Select
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
            >
              <option value="">No context</option>
              {[
                "Poor sleep",
                "Low energy",
                "Illness",
                "Travel",
                "Incomplete session",
                "Equipment change",
                "Maintaining performance",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Button
            className="full"
            onClick={() => {
              void save();
            }}
          >
            Save workout
          </Button>
        </Sheet>
      )}
      {selected && (
        <Sheet title={selected.exercise.name} onClose={() => setActions(null)}>
          <div className="stack">
            <Button
              variant="secondary"
              onClick={() => {
                setReplace(selected.id);
                setActions(null);
              }}
            >
              <ArrowRightLeft size={18} /> Substitute exercise
            </Button>
            <div className="grid-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void edit((s) => {
                    const i = s.exercises.findIndex(
                      (x) => x.id === selected.id,
                    );
                    if (i > 0)
                      [s.exercises[i - 1], s.exercises[i]] = [
                        s.exercises[i],
                        s.exercises[i - 1],
                      ];
                  });
                  setActions(null);
                }}
              >
                <ChevronUp size={18} /> Move up
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void edit((s) => {
                    const i = s.exercises.findIndex(
                      (x) => x.id === selected.id,
                    );
                    if (i >= 0 && i < s.exercises.length - 1)
                      [s.exercises[i + 1], s.exercises[i]] = [
                        s.exercises[i],
                        s.exercises[i + 1],
                      ];
                  });
                  setActions(null);
                }}
              >
                <ChevronDown size={18} /> Move down
              </Button>
            </div>
            <Field label="Rest target (seconds)">
              <NumericInput
                min="0"
                value={selected.prescription.restSeconds}
                onChange={(e) => {
                  void edit((s) => {
                    const ex = s.exercises.find((x) => x.id === selected.id);
                    if (ex)
                      ex.prescription.restSeconds = Math.max(
                        0,
                        Number(e.target.value),
                      );
                  });
                }}
              />
            </Field>
            <Field label="Superset / circuit group">
              <input
                value={selected.prescription.group}
                placeholder="e.g. Superset A"
                onChange={(e) => {
                  void edit((s) => {
                    const ex = s.exercises.find((x) => x.id === selected.id);
                    if (ex) ex.prescription.group = e.target.value;
                  });
                }}
              />
            </Field>
            {selected.sets.map((set, i) => (
              <div className="row" key={set.id}>
                <span className="small">Set {i + 1}</span>
                <Select
                  aria-label={`Set ${i + 1} category`}
                  value={set.type}
                  onChange={(e) =>
                    updateSet(selected.id, set.id, {
                      type: e.target.value as SetType,
                    })
                  }
                >
                  {setTypes.map((t) => (
                    <option key={t} value={t}>
                      {setTypeLabels[t]}
                    </option>
                  ))}
                </Select>
                <IconButton
                  label={`Move set ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => {
                    void edit((s) => {
                      const ex = s.exercises.find((x) => x.id === selected.id);
                      if (ex && i > 0)
                        [ex.sets[i], ex.sets[i - 1]] = [
                          ex.sets[i - 1],
                          ex.sets[i],
                        ];
                    });
                  }}
                >
                  <ChevronUp size={17} />
                </IconButton>
                <IconButton
                  label={`Delete set ${i + 1}`}
                  onClick={() => {
                    void edit((s) => {
                      const ex = s.exercises.find((x) => x.id === selected.id);
                      if (ex) ex.sets = ex.sets.filter((x) => x.id !== set.id);
                    });
                  }}
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                void edit((s) => {
                  const ex = s.exercises.find((x) => x.id === selected.id);
                  if (ex)
                    ex.sets.forEach((x) => {
                      if (!x.completed) x.skipped = true;
                    });
                });
                setActions(null);
              }}
            >
              Skip unfinished sets
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (
                  selected.sets.some((x) => x.completed) &&
                  !window.confirm(
                    "Remove this exercise and its completed sets from this session?",
                  )
                )
                  return;
                void edit((s) => {
                  s.exercises = s.exercises.filter((x) => x.id !== selected.id);
                  if (s.focusedExerciseId === selected.id)
                    s.focusedExerciseId = undefined;
                });
                setActions(null);
              }}
            >
              Remove exercise
            </Button>
          </div>
        </Sheet>
      )}
      {replaceItem && (
        <Sheet title="Find a substitute" onClose={() => setReplace(null)}>
          <p className="muted">
            Matched by movement, muscle and your equipment. Loads and histories
            stay separate.
          </p>
          {substitutions(replaceItem.exercise, data.exercises, equipment)
            .slice(0, 12)
            .map((ex) => (
              <button
                key={ex.id}
                className="list-row full"
                onClick={() => replaceExercise(ex)}
              >
                <span>
                  {ex.name}
                  <small className="muted">
                    {ex.equipment.join(" · ") || "Bodyweight"}
                  </small>
                </span>
                <ArrowRightLeft size={18} />
              </button>
            ))}
        </Sheet>
      )}
      {voice && (
        <Sheet
          title="Workout voice commands"
          onClose={() => {
            speechStop.current?.();
            setListening(false);
            setVoice(false);
          }}
        >
          <p className="muted">
            Push to talk. Speech may be processed by your browser’s provider.
            You can also type a command.
          </p>
          <Field label="Command">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Log 10 reps at 40 pounds"
            />
          </Field>
          <Button
            className="full"
            onClick={() => {
              runCommand(command);
              setCommand("");
            }}
          >
            Run command
          </Button>
          <Button
            variant="secondary"
            className="full"
            disabled={!speechSupported()}
            onClick={() => {
              if (listening) {
                speechStop.current?.();
                setListening(false);
                return;
              }
              setListening(true);
              speechStop.current = startSpeech(
                (text) => {
                  setCommand(text);
                  setListening(false);
                },
                (message) => {
                  toast(message);
                  setListening(false);
                },
              );
            }}
          >
            <Mic size={18} />
            {listening ? "Stop listening" : "Push to talk"}
          </Button>
          {!speechSupported() && (
            <p className="small muted">
              Speech recognition is unavailable in this browser. Typed commands
              and manual logging work.
            </p>
          )}
          <p className="small muted">
            “Add a set” · “Start a two minute rest” · “How many sets are left?”
            · “Finish workout”
          </p>
        </Sheet>
      )}
    </div>
  );
}

function SetTimerControls({
  name,
  now,
  targetSeconds,
  timer,
  blocked,
  onChange,
  onStart,
  onFinish,
}: {
  name: string;
  now: number;
  targetSeconds: number;
  timer?: SetTimer;
  blocked: boolean;
  onChange: (timer: SetTimer) => void;
  onStart: (mode: SetTimer["mode"]) => void;
  onFinish: () => void;
}) {
  const [chosenMode, setChosenMode] = useState<SetTimer["mode"]>(
    targetSeconds > 0 ? "countdown" : "stopwatch",
  );
  const mode = timer?.mode ?? chosenMode;
  const elapsed = timer ? timerElapsedMs(timer, now) / 1000 : 0;
  const remaining = timer ? timerRemainingSeconds(timer, now) : targetSeconds;
  const running = timer?.startedAt !== undefined;
  const overtime = mode === "countdown" && targetSeconds > 0 && remaining === 0;
  return (
    <div className="hold-timer" role="group" aria-label={`${name} timer`}>
      <div className="hold-timer-display">
        <span className="small">
          {mode === "countdown"
            ? overtime
              ? "Beyond target"
              : "Time remaining"
            : "Time held"}
        </span>
        <strong aria-live="off">
          {overtime ? "+" : ""}
          {formatTime(
            mode === "countdown"
              ? overtime
                ? elapsed - targetSeconds
                : Math.ceil(remaining)
              : elapsed,
          )}
        </strong>
        <p>
          {timer
            ? `${running ? "Timing" : "Paused"} · ${formatTime(elapsed)} elapsed`
            : "Ready when you are"}
          {targetSeconds > 0 ? ` · ${formatTime(targetSeconds)} target` : ""}
        </p>
        <div className="hold-timer-mode" role="group" aria-label="Timer mode">
          {(["countdown", "stopwatch"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              disabled={value === "countdown" && targetSeconds <= 0}
              onClick={() => {
                setChosenMode(value);
                if (timer) onChange({ ...timer, mode: value });
              }}
            >
              {value === "countdown" ? "Countdown" : "Stopwatch"}
            </button>
          ))}
        </div>
      </div>
      <div className="hold-timer-actions">
        <Button
          variant="secondary"
          aria-label={`${running ? "Pause" : timer && elapsed > 0 ? "Resume" : "Start"} ${name} timer`}
          disabled={blocked}
          onClick={() => {
            if (!timer) onStart(mode);
            else
              onChange(running ? pauseSetTimer(timer) : resumeSetTimer(timer));
          }}
        >
          {running ? <Pause size={17} /> : <Play size={17} />}
          {running ? "Pause" : timer && elapsed > 0 ? "Resume" : "Start"}
        </Button>
        <IconButton
          label={`Reset ${name} timer`}
          disabled={!timer}
          onClick={() => {
            if (timer) onChange(resetSetTimer(timer));
          }}
        >
          <RotateCcw size={17} />
        </IconButton>
        <Button
          aria-label={`Finish ${name} timer`}
          disabled={!timer || elapsed <= 0}
          onClick={onFinish}
        >
          <Check size={17} /> Finish set
        </Button>
      </div>
      {blocked && (
        <p className="fine-print">
          Another set timer is active. Return to it above to finish or reset it
          first.
        </p>
      )}
    </div>
  );
}
