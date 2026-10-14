import ReorderList from "./ReorderList";
import { useEffect, useRef } from "react";
import { ArrowLeft, Check, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import type { Session, WorkoutSet, Unit } from "../domain/types";
import {
  circuitElapsedMs,
  circuitRoundStats,
  currentCircuitSet,
  finishCircuit,
  logCircuitRound,
  pauseCircuit,
  resetCircuitClock,
  resumeCircuit,
  normalizeCircuitSetPatch,
} from "../domain/circuit";
import { formatTime } from "../domain/helpers";
import { fromKg, toKg } from "../domain/engine";
import { HelpButton } from "./Help";
import { Button, Field, IconButton, toast } from "./ui";
import { NumericInput } from "./inputs";
import "../circuit.css";

export function CircuitWorkout({
  session,
  now,
  unit,
  onEdit,
  onBack,
  onFinish,
}: {
  session: Session;
  now: number;
  unit: Unit;
  onEdit: (change: (session: Session) => void) => Promise<void>;
  onBack: () => void;
  onFinish: () => void;
}) {
  const clock = session.circuit!;
  const elapsed = circuitElapsedMs(clock, now) / 1000;
  const remaining = Math.max(0, clock.durationSeconds - elapsed);
  const running = clock.startedAt !== undefined;
  const stats = circuitRoundStats(session);
  const alarm = useRef(false);
  useEffect(() => {
    if (remaining <= 0 && !alarm.current) {
      alarm.current = true;
      toast(
        "Circuit time reached. Record any remaining work, then finish when ready.",
      );
      navigator.vibrate?.(80);
    }
    if (remaining > 0) alarm.current = false;
  }, [remaining]);
  async function change(action: (draft: Session) => void) {
    try {
      await onEdit(action);
      return true;
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Your circuit could not be saved.",
      );
      return false;
    }
  }
  function patchSet(
    exerciseId: string,
    setId: string,
    patch: Partial<WorkoutSet>,
  ) {
    const safePatch = normalizeCircuitSetPatch(patch);
    void change((draft) => {
      const set = draft.exercises
        .find((entry) => entry.id === exerciseId)
        ?.sets.find((item) => item.id === setId);
      if (set) Object.assign(set, safePatch);
    });
  }
  const pending = session.exercises.some((entry) => {
    const set = currentCircuitSet(entry, clock.round);
    return set && !set.completed && !set.skipped;
  });
  return (
    <div className="circuit-session">
      <div className="circuit-heading">
        <div className="row between">
          <IconButton label="Back to workout selection" onClick={onBack}>
            <ArrowLeft size={22} />
          </IconButton>
          <span className="eyebrow">TIMED CIRCUIT</span>
          <HelpButton
            compact
            className="icon-btn"
            helpTitle="Timed circuit"
            description="Repeat the listed movements in order until your chosen time limit. Record a completed movement or the remaining round only after doing that work. You can adjust repetitions, log a partial round, pause the timer and finish early. The timer never adds work automatically."
          />
        </div>
        <h1>{session.name}</h1>
        <p className="muted">
          Repeat the movements in order. Record only the work you actually
          complete.
        </p>
      </div>
      <section className="circuit-clock" aria-label="Circuit timer">
        <div className="circuit-clock-main">
          <span className="small muted">
            {remaining > 0 ? "Time remaining" : "Beyond time target"}
          </span>
          <strong aria-live="off">
            {remaining <= 0 ? "+" : ""}
            {formatTime(
              remaining > 0
                ? Math.ceil(remaining)
                : elapsed - clock.durationSeconds,
            )}
          </strong>
          <span className="small muted">
            {clock.finishedAt !== undefined
              ? "Finished"
              : running
                ? "Running"
                : elapsed > 0
                  ? "Paused"
                  : "Ready when you are"}{" "}
            · {formatTime(elapsed)} elapsed ·{" "}
            {formatTime(clock.durationSeconds)} target
          </span>
        </div>
        <div className="circuit-clock-actions">
          <Button
            variant="secondary"
            aria-label={
              running
                ? "Pause circuit timer"
                : elapsed > 0 || clock.finishedAt !== undefined
                  ? "Resume circuit timer"
                  : "Start circuit timer"
            }
            onClick={() => {
              void change((draft) => {
                if (draft.circuit)
                  draft.circuit = running
                    ? pauseCircuit(draft.circuit)
                    : resumeCircuit(draft.circuit);
              });
            }}
          >
            {running ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )}
            {running
              ? "Pause"
              : elapsed > 0 || clock.finishedAt !== undefined
                ? "Resume"
                : "Start timer"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (
                (elapsed > 0 || stats.completed > 0 || stats.partial > 0) &&
                !window.confirm(
                  "Reset the circuit clock to zero? Your recorded movements and rounds will stay saved.",
                )
              )
                return;
              void change((draft) => {
                if (draft.circuit)
                  draft.circuit = resetCircuitClock(draft.circuit);
              });
            }}
          >
            <RotateCcw size={18} aria-hidden="true" />
            Reset clock
          </Button>
        </div>
        <p className="fine-print">
          The timer continues across reloads and while this app is closed. Pause
          to exclude breaks. Reaching zero never records a round for you.
        </p>
      </section>
      <div className="circuit-summary" aria-label="Recorded circuit work">
        <p>
          <strong>{stats.completed}</strong> complete{" "}
          {stats.completed === 1 ? "round" : "rounds"}
        </p>
        <p>
          <strong>{stats.partial}</strong> partial{" "}
          {stats.partial === 1 ? "round" : "rounds"}
        </p>
        <p>
          <strong>{stats.reps}</strong> recorded reps
        </p>
      </div>
      <section aria-label="Current circuit round">
        <div className="circuit-round-heading">
          <h2>Round {clock.round}</h2>
          <span className="small muted">
            Adjust each movement to your actual work
          </span>
        </div>
        <div className="circuit-movements">
          <ReorderList
            items={session.exercises}
            getId={(entry) => entry.id}
            getLabel={(entry) => entry.exercise.name}
            ariaLabel="Reorder circuit movements"
            onReorder={(items) => {
              void change((draft) => {
                const entries = new Map(
                  draft.exercises.map((entry) => [entry.id, entry]),
                );
                draft.exercises = items
                  .map((item) => entries.get(item.id)!)
                  .filter(Boolean);
              });
            }}
            renderItem={(entry, index, handle) => {
              const set = currentCircuitSet(entry, clock.round);
              const skipped = !set || set.skipped;
              const timed =
                entry.exercise.measurement === "duration" ||
                entry.exercise.measurement === "cardio";
              const loaded = entry.exercise.load !== "none" && !timed;
              return (
                <article className="circuit-movement" key={entry.id}>
                  <div className="circuit-movement-title">
                    {handle}
                    <span className="eyebrow">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{entry.exercise.name}</h3>
                      <p className="small muted">
                        {entry.exercise.primary.join(" · ") ||
                          "Custom movement"}{" "}
                        ·{" "}
                        {timed
                          ? `${formatTime(entry.prescription.durationSeconds)} per round`
                          : `${entry.prescription.repMin} reps per round`}
                      </p>
                    </div>
                    {set?.completed && (
                      <Check size={20} aria-label="Recorded" />
                    )}
                  </div>
                  {skipped ? (
                    <p className="small muted">Skipped for this circuit.</p>
                  ) : set?.completed ? (
                    <p className="small muted">
                      Recorded{" "}
                      {timed
                        ? formatTime(set.durationSeconds)
                        : `${set.reps} reps`}
                      {loaded
                        ? ` at ${fromKg(set.weightKg, unit)} ${unit}`
                        : ""}
                      . You can correct it below.
                    </p>
                  ) : (
                    <>
                      <div className="circuit-movement-fields">
                        <Field
                          label={`${entry.exercise.name} ${timed ? "actual seconds" : "actual reps"}`}
                        >
                          <NumericInput
                            min={1}
                            step={timed ? 0.1 : 1}
                            value={timed ? set.durationSeconds : set.reps}
                            onValueChange={(value) =>
                              patchSet(
                                entry.id,
                                set.id,
                                timed
                                  ? { durationSeconds: value ?? 0 }
                                  : { reps: value ?? 0 },
                              )
                            }
                          />
                        </Field>
                        {loaded && (
                          <Field
                            label={`${entry.exercise.name} load (${unit})`}
                          >
                            <NumericInput
                              min={0}
                              step={0.5}
                              value={fromKg(set.weightKg, unit)}
                              onValueChange={(value) =>
                                patchSet(entry.id, set.id, {
                                  weightKg: toKg(value ?? 0, unit),
                                })
                              }
                            />
                          </Field>
                        )}
                        {entry.exercise.measurement === "cardio" && (
                          <Field label={`${entry.exercise.name} distance (km)`}>
                            <NumericInput
                              min={0}
                              step={0.1}
                              value={set.distanceKm}
                              onValueChange={(value) =>
                                patchSet(entry.id, set.id, {
                                  distanceKm: value ?? 0,
                                })
                              }
                            />
                          </Field>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        disabled={clock.finishedAt !== undefined}
                        onClick={() => {
                          void change((draft) =>
                            logCircuitRound(draft, entry.id),
                          );
                        }}
                        aria-label={`Record ${entry.exercise.name} for round ${clock.round}`}
                      >
                        <Check size={17} aria-hidden="true" />
                        Record movement
                      </Button>
                    </>
                  )}
                </article>
              );
            }}
          />
        </div>
        <div className="circuit-round-actions">
          <Button
            disabled={!pending || clock.finishedAt !== undefined}
            onClick={() => {
              void change((draft) => logCircuitRound(draft));
            }}
          >
            Record remaining round <Check size={18} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (
                await change((draft) => {
                  if (draft.circuit)
                    draft.circuit = finishCircuit(draft.circuit);
                })
              )
                onFinish();
            }}
          >
            Finish circuit
          </Button>
        </div>
        <p className="fine-print">
          Stopping partway through? Record the individual movements you
          completed, then finish. Unrecorded targets do not count in your
          history.
        </p>
      </section>
      {session.exercises.some((entry) =>
        entry.sets.some((set) => set.completed && !set.skipped),
      ) && (
        <details className="circuit-round-history">
          <summary>Review or correct recorded movements</summary>
          {session.exercises.map((entry) => (
            <div key={entry.id}>
              <h3>{entry.exercise.name}</h3>
              {entry.sets
                .filter((set) => set.completed && !set.skipped)
                .map((set) => {
                  const timed =
                    entry.exercise.measurement === "duration" ||
                    entry.exercise.measurement === "cardio";
                  return (
                    <div className="circuit-history-row" key={set.id}>
                      <div>
                        <strong>Round {set.circuitRound}</strong>
                        <p className="small muted">{entry.exercise.name}</p>
                      </div>
                      <Field
                        label={`Round ${set.circuitRound} ${entry.exercise.name} ${timed ? "seconds" : "reps"}`}
                      >
                        <NumericInput
                          min={1}
                          step={timed ? 0.1 : 1}
                          value={timed ? set.durationSeconds : set.reps}
                          onValueChange={(value) =>
                            patchSet(
                              entry.id,
                              set.id,
                              timed
                                ? { durationSeconds: value ?? 0 }
                                : { reps: value ?? 0 },
                            )
                          }
                        />
                      </Field>
                      {!timed && entry.exercise.load !== "none" && (
                        <Field
                          label={`Round ${set.circuitRound} ${entry.exercise.name} load (${unit})`}
                        >
                          <NumericInput
                            min={0}
                            step={0.5}
                            value={fromKg(set.weightKg, unit)}
                            onValueChange={(value) =>
                              patchSet(entry.id, set.id, {
                                weightKg: toKg(value ?? 0, unit),
                              })
                            }
                          />
                        </Field>
                      )}
                      {entry.exercise.measurement === "cardio" && (
                        <Field
                          label={`Round ${set.circuitRound} ${entry.exercise.name} distance (km)`}
                        >
                          <NumericInput
                            min={0}
                            step={0.1}
                            value={set.distanceKm}
                            onValueChange={(value) =>
                              patchSet(entry.id, set.id, {
                                distanceKm: value ?? 0,
                              })
                            }
                          />
                        </Field>
                      )}
                      <IconButton
                        label={`Remove ${entry.exercise.name} record from round ${set.circuitRound}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remove this recorded movement from this circuit? Other records will stay saved.",
                            )
                          )
                            patchSet(entry.id, set.id, {
                              completed: false,
                              skipped: false,
                              completedAt: undefined,
                            });
                        }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  );
                })}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
