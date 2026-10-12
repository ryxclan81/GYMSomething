import { scheduledSession } from "../domain/templates";
import { CalendarDays, Check, ChevronRight, Clock } from "lucide-react";
import WorkoutIcon from "./WorkoutIcon";
import type { Template } from "../domain/types";
import { dateKey, formatDate } from "../domain/helpers";
import { useApp } from "../state/store";
import { Button } from "./ui";

/** A day is a list of actual calendar entries, never a suggested fallback workout. */
export function DailyWorkouts({
  onStart,
  onPlan,
  onReview,
  day = dateKey(),
}: {
  onStart: (template: Template, scheduleId: string) => void;
  onPlan: () => void;
  onReview?: () => void;
  day?: string;
}) {
  const { data } = useApp();
  const entries = data.schedule.filter((entry) => entry.date === day);
  const workouts = entries.filter((entry) => entry.status !== "rest");
  const restDay = entries.some((entry) => entry.status === "rest");
  return (
    <section className="daily-workouts" aria-label={`Workouts for ${day}`}>
      <div className="section-heading">
        <h2>
          {day === dateKey()
            ? "Today’s workouts"
            : `${formatDate(day, { weekday: "long" })}’s workouts`}
        </h2>
        <button className="text-btn" onClick={onPlan}>
          View plan
        </button>
      </div>
      {workouts.length === 0 ? (
        <div className="daily-empty">
          <CalendarDays size={25} aria-hidden="true" />
          <div>
            <h3>
              {restDay
                ? "Rest day"
                : day === dateKey()
                  ? "No workouts planned today"
                  : "No workouts planned"}
            </h3>
            <p className="muted">
              {restDay
                ? "Your next training day is in your plan."
                : "Choose a program or add a workout to your calendar."}
            </p>
          </div>
          <Button variant="secondary" onClick={onPlan}>
            Plan workouts
          </Button>
        </div>
      ) : (
        <div className="daily-workout-list">
          {workouts.map((entry) => {
            const snapshot = scheduledSession(data, entry);
            const template =
              data.templates.find((item) => item.id === entry.templateId) ??
              (snapshot
                ? {
                    id: snapshot.templateId ?? snapshot.id,
                    name: snapshot.name,
                    description:
                      "Saved workout; the original template was deleted.",
                    focus: "General fitness" as const,
                    minutes: snapshot.completedAt
                      ? Math.max(
                          0,
                          Math.round(
                            (Date.parse(snapshot.completedAt) -
                              Date.parse(snapshot.startedAt)) /
                              60000,
                          ),
                        )
                      : 0,
                    updatedAt: snapshot.startedAt,
                    exercises: snapshot.exercises.map(
                      (item) => item.prescription,
                    ),
                  }
                : undefined);
            if (!template) return null;
            const active = data.activeSession?.scheduleId === entry.id;
            const planned = entry.status === "planned";
            const blocked = planned && !!data.activeSession && !active;
            const action = active
              ? "Resume"
              : planned
                ? "Start"
                : entry.status === "completed"
                  ? "Review"
                  : "Skipped";
            const muscles = [
              ...new Set(
                template.exercises.flatMap(
                  (prescription) =>
                    data.exercises.find(
                      (exercise) => exercise.id === prescription.exerciseId,
                    )?.primary ?? [],
                ),
              ),
            ];
            return (
              <button
                key={entry.id}
                className={`daily-workout ${active ? "is-active" : ""} ${entry.status}`}
                aria-label={`${action} ${template.name}`}
                disabled={
                  blocked ||
                  entry.status === "skipped" ||
                  (!planned && !onReview)
                }
                onClick={() =>
                  planned ? onStart(template, entry.id) : onReview?.()
                }
              >
                <span className="daily-workout-icon" aria-hidden="true">
                  <WorkoutIcon
                    template={template}
                    exercises={data.exercises}
                    size={40}
                  />
                </span>
                <span className="daily-workout-content">
                  <span className="daily-workout-top">
                    <strong>{template.name}</strong>
                    <span>
                      {entry.status === "completed" && (
                        <Check size={12} aria-hidden="true" />
                      )}
                      {active
                        ? "In progress"
                        : entry.status === "completed"
                          ? "Completed"
                          : entry.status === "skipped"
                            ? "Skipped"
                            : template.focus}
                    </span>
                  </span>
                  <span className="daily-workout-facts">
                    <span>{template.exercises.length} exercises</span>
                    <span>
                      <Clock size={13} aria-hidden="true" /> {template.minutes}{" "}
                      min
                    </span>
                  </span>
                  <span className="daily-workout-muscles">
                    {muscles.slice(0, 4).join(", ")}
                    {muscles.length > 4 ? " + more" : ""}
                  </span>
                </span>
                <span className="daily-workout-action">
                  {action}
                  <ChevronRight size={17} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {data.activeSession &&
        workouts.some(
          (entry) =>
            entry.status === "planned" &&
            entry.id !== data.activeSession?.scheduleId,
        ) && (
          <p className="fine-print">
            Finish your current workout before starting another.
          </p>
        )}
    </section>
  );
}
