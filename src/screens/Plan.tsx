import { NumericInput, Select } from "../components/inputs";
import WorkoutIcon from "../components/WorkoutIcon";
import WorkoutIconPicker from "../components/WorkoutIconPicker";
import { getWorkoutIconId } from "../domain/workoutIcons";
import {
  deleteTemplate,
  deleteProgram,
  programDeletionImpact,
  scheduledSession,
  sortTemplates,
  templateDeletionImpact,
  templateSortOptions,
  type TemplateSort,
} from "../domain/templates";
import "../planning-ui.css";
import { useState } from "react";
import ProgramApply from "../components/ProgramApply";
import ProgramPhases from "../components/ProgramPhases";
import ReorderList from "../components/ReorderList";
import { CircuitTemplateEditor } from "../components/CircuitTemplateEditor";
import { validateCircuitTemplate } from "../domain/circuit";
import { addRecommendedPresets, recommendPresets } from "../domain/presets";
import { useHorizontalSwipe } from "../components/useHorizontalSwipe";
import { applyProgram, programValidation } from "../domain/planning";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dumbbell,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type {
  Focus,
  Prescription,
  Program,
  Schedule,
  Template,
} from "../domain/types";
import {
  addDays,
  dateKey,
  formatDate,
  id,
  parseDate,
  prescription,
  weekStart,
} from "../domain/helpers";
import { fromKg, toKg } from "../domain/engine";
import { useApp, updateData } from "../state/store";
import { Sheet, toast } from "../components/ui";
import { Library } from "./Library";
import { NumberField, RuleEditor } from "./TrainingRules";
export { RuleEditor } from "./TrainingRules";

const focuses: Focus[] = [
  "Hypertrophy",
  "Strength",
  "Endurance",
  "Cardio",
  "Calisthenics",
  "General fitness",
  "Hybrid",
];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const freshTemplate = (): Template => ({
  id: id(),
  name: "",
  description: "",
  focus: "Hypertrophy",
  minutes: 45,
  exercises: [],
  updatedAt: new Date().toISOString(),
});
const freshProgram = (): Program => ({
  id: id(),
  name: "",
  description: "",
  startDate: dateKey(),
  templateIds: [],
  days: [1, 3, 5],
  phase: "Foundation",
});

export function Plan({
  onStart,
}: {
  onStart: (template: Template, scheduleId?: string) => void;
}) {
  const { data } = useApp();
  const [week, setWeek] = useState(weekStart());
  const [tab, setTab] = useState("Week");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [applying, setApplying] = useState<Program | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const swipe = useHorizontalSwipe({
    onPrevious: () => setWeek(addDays(week, -7)),
    onNext: () => setWeek(addDays(week, 7)),
  });
  const [workoutSort, setWorkoutSort] = useState<TemplateSort>("recent");
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const planned = data.schedule.filter(
    (s) =>
      days.includes(s.date) && s.status !== "rest" && s.status !== "skipped",
  );
  const completed = planned.filter((s) => s.status === "completed").length;
  const templates = sortTemplates(
    data.templates.filter((t) => (showArchived ? true : !t.archived)),
    workoutSort,
  );
  const programs = data.programs.filter((p) =>
    showArchived ? true : !p.archived,
  );
  const duplicate = async (t: Template) => {
    const copy: Template = {
      ...structuredClone(t),
      id: id(),
      name: `${t.name} · copy`,
      archived: false,
      updatedAt: new Date().toISOString(),
      exercises: t.exercises.map((p) => ({ ...structuredClone(p), id: id() })),
    };
    await updateData((d) => {
      d.templates.unshift(copy);
    });
    setEditing(copy);
    toast("Workout duplicated");
  };
  return (
    <div className="page plan-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">INTENTION INTO ACTION</div>
          <h1>
            Your plan<span className="accent">.</span>
          </h1>
          <p className="muted">Build a rhythm that works for you.</p>
        </div>
        <button
          className="btn secondary"
          aria-label="Create workout"
          onClick={() => setEditing(freshTemplate())}
        >
          <Plus size={18} />
          <span> Create</span>
        </button>
      </header>
      <div className="segmented-control">
        {["Week", "Workouts", "Programs"].map((t) => (
          <button
            className={t === tab ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Week" && (
        <>
          <div className="week-navigation">
            <button
              className="icon-button"
              aria-label="Previous week"
              onClick={() => setWeek(addDays(week, -7))}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <strong>
                {formatDate(week)} — {formatDate(addDays(week, 6))}
              </strong>
              <small className="muted">
                {completed} / {planned.length} scheduled workouts complete
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Next week"
              onClick={() => setWeek(addDays(week, 7))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="week-strip" {...swipe}>
            {days.map((day) => {
              const entries = data.schedule.filter((s) => s.date === day);
              const today = day === dateKey();
              return (
                <button
                  className={`calendar-day ${today ? "today" : ""} ${selectedDate === day ? "selected" : ""}`}
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  aria-label={`Schedule ${formatDate(day, { weekday: "long", month: "long", day: "numeric" })}`}
                >
                  <small>{formatDate(day, { weekday: "short" })}</small>
                  <strong>{parseDate(day).getDate()}</strong>
                  <span
                    className={`calendar-dot ${entries.some((s) => s.status === "completed") || data.sessions.some((s) => s.completedAt && dateKey(new Date(s.completedAt)) === day) ? "complete" : entries.some((s) => s.status === "planned") ? "planned" : ""}`}
                  />
                </button>
              );
            })}
          </div>
          <div className="planner-days">
            {days.map((day) => {
              const entries = data.schedule.filter((s) => s.date === day);
              return (
                <section className="planner-day" key={day}>
                  <div className="planner-day-label">
                    <span className="eyebrow">
                      {formatDate(day, { weekday: "short" })}
                    </span>
                    <strong className={day === dateKey() ? "accent" : ""}>
                      {parseDate(day).getDate()}
                    </strong>
                  </div>
                  <div className="planner-day-content">
                    {entries.length === 0 ? (
                      <button
                        className="unscheduled-day"
                        onClick={() => setSelectedDate(day)}
                      >
                        <span className="muted">Open day</span>
                        <Plus size={16} />
                      </button>
                    ) : (
                      entries.map((s) => {
                        const t = data.templates.find(
                          (t) => t.id === s.templateId,
                        );
                        const snapshot = scheduledSession(data, s);
                        return (
                          <div
                            className={`scheduled-workout ${s.status}`}
                            key={s.id}
                          >
                            <button
                              className="schedule-main"
                              onClick={() => setSchedule(s)}
                            >
                              <span className="eyebrow">
                                {s.status === "rest"
                                  ? "RECOVERY"
                                  : s.status === "completed"
                                    ? "COMPLETED"
                                    : s.status === "skipped"
                                      ? "SKIPPED"
                                      : day < dateKey()
                                        ? "MISSED"
                                        : "PLANNED"}
                              </span>
                              <strong>
                                {s.status === "rest"
                                  ? "Rest & recover"
                                  : (t?.name ??
                                    snapshot?.name ??
                                    "Saved workout")}
                              </strong>
                              {t && s.status !== "rest" && (
                                <small className="muted">
                                  {t.minutes} min · {t.exercises.length}{" "}
                                  movements · {t.focus}
                                  {s.status === "completed" &&
                                  s.sessionId &&
                                  data.sessions.find(
                                    (session) => session.id === s.sessionId,
                                  )?.completedAt &&
                                  dateKey(
                                    new Date(
                                      data.sessions.find(
                                        (session) => session.id === s.sessionId,
                                      )!.completedAt!,
                                    ),
                                  ) !== day
                                    ? ` · Completed ${formatDate(dateKey(new Date(data.sessions.find((session) => session.id === s.sessionId)!.completedAt!)))}`
                                    : ""}
                                </small>
                              )}
                            </button>
                            {s.status === "planned" && t && (
                              <button
                                className="icon-button"
                                aria-label={`Start ${t.name}`}
                                onClick={() => onStart(t, s.id)}
                              >
                                <Play size={19} />
                              </button>
                            )}
                            <button
                              className="icon-button"
                              aria-label="Schedule options"
                              onClick={() => setSchedule(s)}
                            >
                              <MoreHorizontal size={19} />
                            </button>
                          </div>
                        );
                      })
                    )}
                    {data.sessions
                      .filter(
                        (session) =>
                          session.completedAt &&
                          dateKey(new Date(session.completedAt)) === day &&
                          (!session.scheduleId ||
                            data.schedule.find(
                              (s) => s.id === session.scheduleId,
                            )?.date !== day),
                      )
                      .map((session) => (
                        <div
                          className="scheduled-workout completed"
                          key={session.id}
                        >
                          <div className="schedule-main">
                            <span className="eyebrow">COMPLETED</span>
                            <strong>{session.name}</strong>
                            <small className="muted">
                              {session.exercises.length} movements · Saved in
                              your workout journal
                            </small>
                          </div>
                          <Check size={17} className="accent" />
                        </div>
                      ))}
                    {entries.length > 0 && (
                      <button
                        className="add-day-action"
                        onClick={() => setSelectedDate(day)}
                        aria-label={`Add workout on ${formatDate(day)}`}
                      >
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {week !== weekStart() && (
            <button className="btn ghost" onClick={() => setWeek(weekStart())}>
              Back to this week
            </button>
          )}
          <div className="editorial-note">
            <CalendarDays size={19} />
            <p>
              Rest is part of the plan. Move a session whenever life happens —
              your program stays intact.
            </p>
          </div>
        </>
      )}
      {tab === "Workouts" && (
        <>
          <div className="plan-workout-toolbar">
            <span className="eyebrow">
              {templates.length} WORKOUT TEMPLATES
            </span>
            <button
              className="btn ghost"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
            <label>
              Sort workouts
              <Select
                className="input"
                value={workoutSort}
                onChange={(event) =>
                  setWorkoutSort(event.target.value as TemplateSort)
                }
              >
                {templateSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="preset-library-entry">
            <p className="muted">
              Want a starting point? See a small selection matched to your
              training preferences and equipment.
            </p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowPresets(true)}
            >
              <Dumbbell size={17} /> Browse matching presets
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="empty-state">
              <Dumbbell size={28} />
              <h3>Your first workout starts here</h3>
              <p className="muted">
                Choose your movements, set your targets, and save a workout you
                can repeat.
              </p>
              <button
                className="btn primary"
                onClick={() => setEditing(freshTemplate())}
              >
                Create workout
              </button>
            </div>
          ) : (
            templates.map((t) => (
              <article className="template-row" key={t.id}>
                <div className="template-number">
                  <WorkoutIcon
                    template={t}
                    exercises={data.exercises}
                    size={40}
                  />
                </div>
                <div className="template-info">
                  <span className="eyebrow">
                    {t.focus.toUpperCase()} {t.archived ? " / ARCHIVED" : ""}
                  </span>
                  <button className="text-button" onClick={() => setEditing(t)}>
                    <h3>{t.name}</h3>
                  </button>
                  <p className="muted">
                    {t.exercises.length} exercises · {t.minutes} minutes
                  </p>
                  <small className="muted">
                    {t.exercises
                      .slice(0, 3)
                      .map(
                        (p) =>
                          data.exercises.find((e) => e.id === p.exerciseId)
                            ?.name,
                      )
                      .filter(Boolean)
                      .join(" / ")}
                    {t.exercises.length > 3 ? " / …" : ""}
                  </small>
                  <div
                    className="row"
                    style={{ justifyContent: "flex-start", marginTop: 16 }}
                  >
                    <button
                      className="btn secondary"
                      onClick={() => onStart(t)}
                    >
                      <Play size={15} /> Start
                    </button>
                    <button className="btn ghost" onClick={() => setEditing(t)}>
                      Edit
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Duplicate ${t.name}`}
                      onClick={() => void duplicate(t)}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </>
      )}
      {tab === "Programs" && (
        <>
          <div className="section-heading">
            <span className="eyebrow">REUSABLE ROTATIONS</span>
            <button
              className="btn secondary"
              onClick={() => setProgram(freshProgram())}
            >
              <Plus size={16} /> New program
            </button>
          </div>
          {programs.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={28} />
              <h3>Give your training direction</h3>
              <p className="muted">
                Combine saved workouts in a repeatable order. Choose how far
                ahead to schedule dates when you use the program.
              </p>
              <button
                className="btn primary"
                onClick={() => setProgram(freshProgram())}
              >
                Build a program
              </button>
            </div>
          ) : (
            <div className="plan-program-list">
              {programs.map((p) => (
                <article className="program-row" key={p.id}>
                  <div className="section-heading">
                    <span className="eyebrow">
                      {p.weeks
                        ? `${p.weeks}-WEEK SCHEDULE`
                        : "REUSABLE PROGRAM"}{" "}
                      {p.archived ? " / ARCHIVED" : ""}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => setProgram(p)}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <h2>{p.name}</h2>
                  <p className="muted">{p.description}</p>
                  <div className="program-line">
                    <span>{p.phase}</span>
                    {p.weeks && (
                      <span className="muted">
                        {formatDate(p.startDate)} —{" "}
                        {formatDate(addDays(p.startDate, p.weeks * 7 - 1))}
                      </span>
                    )}
                  </div>
                  <div className="chip-row">
                    {p.days.map((day) => (
                      <span key={day} className="chip">
                        {weekdays[day]}
                      </span>
                    ))}
                    {p.deloadWeek && (
                      <span className="chip">Lighter week {p.deloadWeek}</span>
                    )}
                  </div>
                  <p className="muted program-workouts">
                    {p.templateIds
                      .map((t) => data.templates.find((x) => x.id === t)?.name)
                      .filter(Boolean)
                      .join(" / ") ||
                      "Add workouts to this rotation before scheduling it."}
                  </p>
                  <div className="row" style={{ justifyContent: "flex-start" }}>
                    <button
                      className="btn primary"
                      disabled={Boolean(p.archived) || !p.templateIds.length}
                      onClick={() => setApplying(p)}
                    >
                      Use program
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setProgram(p)}
                    >
                      Edit program
                    </button>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        const copy = {
                          ...structuredClone(p),
                          id: id(),
                          name: `${p.name} · copy`,
                          archived: false,
                        };
                        await updateData((d) => {
                          d.programs.push(copy);
                        });
                        setProgram(copy);
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        const repeat = {
                          ...structuredClone(p),
                          id: id(),
                          startDate: addDays(p.startDate, (p.weeks ?? 4) * 7),
                          archived: false,
                        };
                        await updateData((d) => {
                          d.programs.push(repeat);
                        });
                        setProgram(repeat);
                      }}
                    >
                      Repeat
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {showPresets && <PresetReview onClose={() => setShowPresets(false)} />}
      {selectedDate && (
        <Sheet
          title={`Plan ${formatDate(selectedDate, { weekday: "long", month: "short", day: "numeric" })}`}
          onClose={() => setSelectedDate(null)}
        >
          <div className="stack">
            <p className="muted">
              Select a workout for this day. You can move or adjust it later.
            </p>
            {data.templates
              .filter((t) => !t.archived)
              .map((t) => (
                <button
                  className="list-row btn ghost"
                  key={t.id}
                  onClick={async () => {
                    await updateData((d) => {
                      d.schedule.push({
                        id: id(),
                        date: selectedDate,
                        templateId: t.id,
                        status: "planned",
                      });
                    });
                    setSelectedDate(null);
                    toast("Workout scheduled");
                  }}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <small className="muted">
                      {t.minutes} min · {t.focus}
                    </small>
                  </div>
                  <Plus size={18} />
                </button>
              ))}
            <button
              className="btn secondary"
              onClick={async () => {
                await updateData((d) => {
                  d.schedule.push({
                    id: id(),
                    date: selectedDate,
                    templateId: "",
                    status: "rest",
                  });
                });
                setSelectedDate(null);
                toast("Rest day planned");
              }}
            >
              Plan a rest day
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setSelectedDate(null);
                setEditing(freshTemplate());
              }}
            >
              Create a new workout
            </button>
          </div>
        </Sheet>
      )}
      {schedule && (
        <Sheet title="Scheduled session" onClose={() => setSchedule(null)}>
          <ScheduleEditor
            entry={schedule}
            onClose={() => setSchedule(null)}
            onStart={onStart}
            onTemplate={(t) => {
              setSchedule(null);
              setEditing(t);
            }}
          />
        </Sheet>
      )}
      {editing && (
        <Sheet
          title={editing.name ? "Edit workout" : "Create workout"}
          onClose={() => setEditing(null)}
        >
          <TemplateEditor template={editing} onClose={() => setEditing(null)} />
        </Sheet>
      )}
      {applying && (
        <ProgramApply
          program={applying}
          onClose={() => setApplying(null)}
          onApplied={(startDate) => {
            setApplying(null);
            setWeek(weekStart(startDate));
            setTab("Week");
          }}
        />
      )}
      {program && (
        <Sheet
          title={program.name ? "Edit program" : "New program"}
          onClose={() => setProgram(null)}
        >
          <ProgramEditor program={program} onClose={() => setProgram(null)} />
        </Sheet>
      )}
    </div>
  );
}

function ScheduleEditor({
  entry,
  onClose,
  onStart,
  onTemplate,
}: {
  entry: Schedule;
  onClose: () => void;
  onStart: (template: Template, scheduleId?: string) => void;
  onTemplate: (template: Template) => void;
}) {
  const { data } = useApp();
  const [date, setDate] = useState(entry.date);
  const [swap, setSwap] = useState("");
  const [templateId, setTemplateId] = useState(entry.templateId);
  const t = data.templates.find((t) => t.id === entry.templateId);
  const snapshot = scheduledSession(data, entry);
  const save = async () => {
    await updateData((d) => {
      const schedule = d.schedule.find((s) => s.id === entry.id);
      if (schedule) {
        schedule.date = date;
        schedule.templateId = templateId;
      }
    });
    toast("Schedule updated");
    onClose();
  };
  return (
    <div className="stack">
      <h2>
        {entry.status === "rest"
          ? "Rest day"
          : (t?.name ?? snapshot?.name ?? "Workout")}
      </h2>
      <p className="muted">
        {formatDate(entry.date, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}{" "}
        · {entry.status}
      </p>
      {entry.status === "completed" && (
        <p className="muted">
          Completed history stays on the date you actually trained.
        </p>
      )}
      <label className="field">
        Move to date
        <input
          className="input"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {entry.status === "planned" && t && (
        <label className="field">
          Workout
          <Select
            className="input"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {data.templates
              .filter((x) => !x.archived || x.id === entry.templateId)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </Select>
        </label>
      )}
      <button
        className="btn primary"
        disabled={!date}
        onClick={() => void save()}
      >
        <Check size={17} /> Save schedule
      </button>
      {entry.status === "planned" && t && (
        <button
          className="btn secondary"
          onClick={() => {
            onClose();
            onStart(t, entry.id);
          }}
        >
          <Play size={17} /> Start workout now
        </button>
      )}
      {t && (
        <button className="btn ghost" onClick={() => onTemplate(t)}>
          Edit workout targets
        </button>
      )}
      {(t || entry.status === "rest") && (
        <button
          className="btn secondary"
          onClick={async () => {
            await updateData((d) => {
              d.schedule.push({
                ...entry,
                id: id(),
                date,
                status: entry.status === "rest" ? "rest" : "planned",
                sessionId: undefined,
              });
            });
            toast("Session duplicated");
            onClose();
          }}
        >
          <Copy size={17} /> Duplicate on selected date
        </button>
      )}
      {!t && snapshot && (
        <p className="muted">
          This calendar entry is linked to your saved workout. Its deleted
          template cannot be edited or duplicated.
        </p>
      )}
      {entry.status === "planned" && t && (
        <>
          <label className="field">
            Swap with another planned session
            <Select
              className="input"
              value={swap}
              onChange={(e) => setSwap(e.target.value)}
            >
              <option value="">Choose a session</option>
              {data.schedule
                .filter((s) => s.id !== entry.id && s.status === "planned")
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.date)} ·{" "}
                    {data.templates.find((t) => t.id === s.templateId)?.name ??
                      "Workout"}
                  </option>
                ))}
            </Select>
          </label>
          <button
            className="btn secondary"
            disabled={!swap}
            onClick={async () => {
              await updateData((d) => {
                const a = d.schedule.find((s) => s.id === entry.id);
                const b = d.schedule.find((s) => s.id === swap);
                if (a && b) {
                  const original = a.date;
                  a.date = b.date;
                  b.date = original;
                }
              });
              toast("Sessions swapped");
              onClose();
            }}
          >
            Swap days
          </button>
          <button
            className="btn ghost"
            onClick={async () => {
              await updateData((d) => {
                const s = d.schedule.find((s) => s.id === entry.id);
                if (s) s.status = "skipped";
              });
              toast("Session skipped");
              onClose();
            }}
          >
            Skip this session
          </button>
        </>
      )}
      {entry.status === "skipped" && t && (
        <button
          className="btn secondary"
          onClick={async () => {
            await updateData((d) => {
              const s = d.schedule.find((s) => s.id === entry.id);
              if (s) {
                s.status = "planned";
                s.date = date;
              }
            });
            onClose();
            toast("Session rescheduled");
          }}
        >
          <RotateCcw size={17} /> Reschedule
        </button>
      )}
      <button
        className="btn danger"
        onClick={async () => {
          await updateData((d) => {
            d.schedule = d.schedule.filter((s) => s.id !== entry.id);
          });
          toast("Removed from schedule. History is preserved.");
          onClose();
        }}
      >
        Remove from schedule
      </button>
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const { data } = useApp();
  const [draft, setDraft] = useState<Template>(structuredClone(template));
  const [picking, setPicking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const patch = (value: Partial<Template>) =>
    setDraft((d) => ({ ...d, ...value }));
  const setPrescription = (
    prescriptionId: string,
    value: Partial<Prescription>,
  ) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((p) =>
        p.id === prescriptionId ? { ...p, ...value } : p,
      ),
    }));
  const save = async () => {
    if (!draft.name.trim() || draft.exercises.length === 0) {
      setError("Give your workout a name and add at least one exercise.");
      return;
    }
    const circuitError = validateCircuitTemplate(draft, data.exercises);
    if (circuitError) {
      setError(circuitError);
      return;
    }
    if (draft.exercises.some((p) => p.repMin > p.repMax)) {
      setError("Minimum repetitions must not exceed maximum repetitions.");
      return;
    }
    setSaving(true);
    try {
      await updateData((d) => {
        const value = {
          ...draft,
          name: draft.name.trim(),
          icon: getWorkoutIconId(draft),
          updatedAt: new Date().toISOString(),
        };
        const index = d.templates.findIndex((t) => t.id === draft.id);
        if (index >= 0) d.templates[index] = value;
        else d.templates.unshift(value);
      });
      toast("Workout saved");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save workout.");
    } finally {
      setSaving(false);
    }
  };
  if (picking)
    return (
      <Library
        onBack={() => setPicking(false)}
        onPick={(e) => {
          setDraft((d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              (() => {
                const target = prescription(e);
                return d.circuit
                  ? {
                      ...target,
                      sets: 1,
                      repMax: target.repMin,
                      restSeconds: 0,
                    }
                  : target;
              })(),
            ],
          }));
          setPicking(false);
        }}
      />
    );
  return (
    <>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          Workout name
          <input
            className="input"
            required
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Upper body A"
          />
        </label>
        <WorkoutIconPicker
          value={getWorkoutIconId(draft)}
          onChange={(icon) => patch({ icon })}
        />
        <label className="field">
          Description
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="The purpose of this workout"
          />
        </label>
        <div className="grid-2">
          <label className="field">
            Training focus
            <Select
              className="input"
              value={draft.focus}
              onChange={(e) => patch({ focus: e.target.value as Focus })}
            >
              {focuses.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </label>
          {!draft.circuit && (
            <label className="field">
              Estimated session length (minutes)
              <NumericInput
                className="input"
                min={5}
                max={300}
                required
                value={draft.minutes}
                onChange={(e) => patch({ minutes: Number(e.target.value) })}
              />
            </label>
          )}
        </div>
        <CircuitTemplateEditor
          value={draft.circuit}
          onChange={(circuit) =>
            setDraft((previous) => ({
              ...previous,
              circuit,
              minutes: circuit
                ? Math.ceil(circuit.durationSeconds / 60)
                : previous.minutes,
              exercises: circuit
                ? previous.exercises.map((entry) => ({
                    ...entry,
                    sets: 1,
                    repMax: entry.repMin,
                    restSeconds: 0,
                  }))
                : previous.exercises,
            }))
          }
        />
        <div className="section-heading">
          <h3>Movements</h3>
          <span className="muted">{draft.exercises.length}</span>
        </div>
        <ReorderList
          items={draft.exercises}
          getId={(entry) => entry.id}
          getLabel={(entry) =>
            data.exercises.find((exercise) => exercise.id === entry.exerciseId)
              ?.name ?? "Archived exercise"
          }
          onReorder={(exercises) => patch({ exercises })}
          ariaLabel="Workout exercise order"
          renderItem={(p, index, handle) => {
            const exercise = data.exercises.find((e) => e.id === p.exerciseId);
            return (
              <div key={p.id} className="prescription-editor surface">
                <div className="row">
                  {handle}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <span className="eyebrow">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{exercise?.name ?? "Archived exercise"}</strong>
                    {exercise && (
                      <small className="muscle-label">
                        Targets: {exercise.primary.join(", ")}
                      </small>
                    )}
                    <small className="muted">
                      {draft.circuit ? "Each round" : `${p.sets} sets`} ·{" "}
                      {exercise?.measurement === "cardio"
                        ? `${Math.round(p.durationSeconds / 60)} min`
                        : exercise?.measurement === "duration"
                          ? `${p.durationSeconds}s`
                          : draft.circuit
                            ? `${p.repMin} reps`
                            : `${p.repMin}–${p.repMax} reps`}{" "}
                      {draft.circuit
                        ? " · repeat until timer ends"
                        : ` · ${p.restSeconds}s rest`}{" "}
                      {p.group ? ` / Group ${p.group}` : ""}
                    </small>
                  </button>
                  <div className="row">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Remove exercise"
                      onClick={() =>
                        patch({
                          exercises: draft.exercises.filter(
                            (x) => x.id !== p.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {expanded === p.id && (
                  <div className="stack" style={{ marginTop: 20 }}>
                    <div className="grid-2">
                      {!draft.circuit && (
                        <NumberField
                          label="Sets"
                          min={1}
                          max={30}
                          value={p.sets}
                          onChange={(sets) => setPrescription(p.id, { sets })}
                        />
                      )}
                      {exercise?.measurement === "duration" ||
                      exercise?.measurement === "cardio" ? (
                        <>
                          <NumberField
                            label="Duration (seconds)"
                            min={1}
                            max={86400}
                            value={p.durationSeconds}
                            onChange={(durationSeconds) =>
                              setPrescription(p.id, { durationSeconds })
                            }
                          />
                          {exercise.measurement === "cardio" && (
                            <NumberField
                              label="Distance (km)"
                              step={0.1}
                              min={0}
                              max={1000}
                              value={p.distanceKm}
                              onChange={(distanceKm) =>
                                setPrescription(p.id, { distanceKm })
                              }
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {draft.circuit ? (
                            <NumberField
                              label="Per-round reps"
                              min={1}
                              max={500}
                              value={p.repMin}
                              onChange={(reps) =>
                                setPrescription(p.id, {
                                  repMin: reps,
                                  repMax: reps,
                                })
                              }
                            />
                          ) : (
                            <>
                              <NumberField
                                label="Minimum reps"
                                min={1}
                                max={500}
                                value={p.repMin}
                                onChange={(repMin) =>
                                  setPrescription(p.id, { repMin })
                                }
                              />
                              <NumberField
                                label="Maximum reps"
                                min={1}
                                max={500}
                                value={p.repMax}
                                onChange={(repMax) =>
                                  setPrescription(p.id, { repMax })
                                }
                              />
                            </>
                          )}
                          {exercise?.load !== "none" && (
                            <NumberField
                              label={`Target load (${data.profile.unit}${exercise?.load === "per-hand" ? " per hand" : ""})`}
                              min={0}
                              max={2000}
                              step={0.01}
                              value={Number(
                                fromKg(p.weightKg, data.profile.unit).toFixed(
                                  2,
                                ),
                              )}
                              onChange={(weight) =>
                                setPrescription(p.id, {
                                  weightKg: toKg(weight, data.profile.unit),
                                })
                              }
                            />
                          )}
                        </>
                      )}
                      {!draft.circuit && (
                        <NumberField
                          label="Rest (seconds)"
                          min={0}
                          max={1800}
                          value={p.restSeconds}
                          onChange={(restSeconds) =>
                            setPrescription(p.id, { restSeconds })
                          }
                        />
                      )}
                      <label className="field">
                        Target RIR (optional)
                        <NumericInput
                          className="input"
                          min={0}
                          max={10}
                          value={p.rir ?? ""}
                          onChange={(e) =>
                            setPrescription(p.id, {
                              rir:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        Target RPE (optional)
                        <NumericInput
                          className="input"
                          min={1}
                          max={10}
                          step={0.5}
                          value={p.rpe ?? ""}
                          onChange={(e) =>
                            setPrescription(p.id, {
                              rpe:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    {!draft.circuit && (
                      <label className="field">
                        Superset / circuit group
                        <input
                          className="input"
                          value={p.group}
                          onChange={(e) =>
                            setPrescription(p.id, { group: e.target.value })
                          }
                          placeholder="A, B, or Circuit 1"
                        />
                        <small className="muted">
                          Use the same group for movements you want to
                          alternate.
                        </small>
                      </label>
                    )}
                    <label className="field">
                      Exercise cues
                      <textarea
                        className="input"
                        rows={2}
                        value={p.notes}
                        onChange={(e) =>
                          setPrescription(p.id, { notes: e.target.value })
                        }
                      />
                    </label>
                    {!draft.circuit && (
                      <details>
                        <summary>Progression rules</summary>
                        <div className="stack" style={{ marginTop: 16 }}>
                          <label className="row">
                            <span>Use exercise-specific rules</span>
                            <input
                              type="checkbox"
                              checked={Boolean(p.rule)}
                              onChange={(e) =>
                                setPrescription(p.id, {
                                  rule: e.target.checked
                                    ? {
                                        ...data.profile.progression,
                                        repMin: p.repMin,
                                        repMax: p.repMax,
                                      }
                                    : undefined,
                                })
                              }
                            />
                          </label>
                          {p.rule ? (
                            <RuleEditor
                              rule={p.rule}
                              onChange={(rule) =>
                                setPrescription(p.id, { rule })
                              }
                              unit={data.profile.unit}
                            />
                          ) : (
                            <p className="muted">
                              Uses your profile's progression rule. Suggestions
                              always require your confirmation.
                            </p>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => setPicking(true)}
        >
          <Plus size={17} /> Add movement
        </button>
        <p className="muted">
          Template edits apply to future workouts. Active and completed workouts
          preserve their original targets.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn primary full-width"
          type="submit"
          disabled={saving}
        >
          <Check size={17} /> {saving ? "Saving…" : "Save workout"}
        </button>
        {data.templates.some((t) => t.id === template.id) && (
          <>
            <button
              className="btn secondary"
              type="button"
              onClick={async () => {
                const shortened: Template = {
                  ...structuredClone(draft),
                  id: id(),
                  name: `${draft.name} · short`,
                  minutes: draft.circuit
                    ? Math.ceil(
                        Math.max(
                          1,
                          Math.round(draft.circuit.durationSeconds / 2),
                        ) / 60,
                      )
                    : Math.max(15, Math.round(draft.minutes / 2)),
                  circuit: draft.circuit
                    ? {
                        durationSeconds: Math.max(
                          1,
                          Math.round(draft.circuit.durationSeconds / 2),
                        ),
                      }
                    : undefined,
                  exercises: draft.exercises
                    .slice(
                      0,
                      Math.max(1, Math.ceil(draft.exercises.length / 2)),
                    )
                    .map((p) => ({ ...p, id: id() })),
                  updatedAt: new Date().toISOString(),
                  archived: false,
                };
                await updateData((d) => {
                  d.templates.unshift(shortened);
                });
                toast(
                  "Short version saved with your first priority movements. Edit it from Workouts.",
                );
              }}
            >
              Save a shortened version
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={async () => {
                await updateData((d) => {
                  const t = d.templates.find((x) => x.id === template.id);
                  if (t) t.archived = !t.archived;
                });
                toast(
                  template.archived
                    ? "Workout restored"
                    : "Workout archived; history and schedule are preserved",
                );
                onClose();
              }}
            >
              {template.archived ? "Restore workout" : "Archive workout"}
            </button>
            <button
              type="button"
              className="btn danger"
              aria-label={`Delete ${template.name}`}
              disabled={saving}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={17} /> Delete workout
            </button>
          </>
        )}
      </form>
      {deleting && (
        <DeleteWorkoutReview
          template={template}
          onCancel={() => setDeleting(false)}
          onDeleted={onClose}
        />
      )}
    </>
  );
}

function DeleteWorkoutReview({
  template,
  onCancel,
  onDeleted,
}: {
  template: Template;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const { data } = useApp();
  const impact = templateDeletionImpact(data, template.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Sheet title="Delete workout" onClose={onCancel}>
      <div className="delete-workout-review">
        <p>
          Permanently delete <strong>{template.name}</strong> from your
          workouts?
        </p>
        <div className="delete-workout-summary">
          <ul>
            <li>
              {impact.removed.length} unstarted calendar{" "}
              {impact.removed.length === 1 ? "entry" : "entries"} will be
              removed.
            </li>
            <li>
              {impact.programs.length}{" "}
              {impact.programs.length === 1 ? "program" : "programs"} will stop
              using this workout.
            </li>
            <li>
              {impact.historyCount} saved{" "}
              {impact.historyCount === 1 ? "session" : "sessions"} and{" "}
              {impact.retained.length} linked calendar{" "}
              {impact.retained.length === 1 ? "entry" : "entries"} will stay
              intact.
            </li>
            {impact.preservesActive && (
              <li>
                Your active workout, logged sets and rest timer will stay
                intact.
              </li>
            )}
            {impact.pendingSuggestions > 0 && (
              <li>
                {impact.pendingSuggestions} pending progression{" "}
                {impact.pendingSuggestions === 1 ? "prompt" : "prompts"} for
                this workout will be dismissed.
              </li>
            )}
          </ul>
        </div>
        {impact.emptyPrograms.length > 0 && (
          <p className="muted">
            {impact.emptyPrograms.map((program) => program.name).join(", ")}{" "}
            will need a new workout before you can schedule it again.
          </p>
        )}
        {impact.blocked.length > 0 && (
          <p className="error-text" role="alert">
            A completed calendar entry has no saved session attached. Remove
            that calendar entry or archive this workout before deleting it.
          </p>
        )}
        <p className="muted">
          This cannot be undone. You can export a backup from Settings first.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="delete-workout-actions">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Keep workout
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={busy || !impact.exists || impact.blocked.length > 0}
            onClick={async () => {
              setBusy(true);
              try {
                await updateData((draft) => {
                  deleteTemplate(draft, template.id);
                });
                toast("Workout deleted; saved sessions are preserved");
                onDeleted();
              } catch (exception) {
                setError(
                  exception instanceof Error
                    ? exception.message
                    : "Unable to delete this workout.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Delete workout"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function PresetReview({ onClose }: { onClose: () => void }) {
  const { data } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const equipment =
    data.equipment.find((item) => item.id === data.activeEquipmentId) ??
    data.equipment[0];
  const recommendation = recommendPresets(
    data.profile,
    equipment,
    data.exercises,
  );
  const available = recommendation.templates.filter(
    (template) => !data.templates.some((saved) => saved.id === template.id),
  );
  return (
    <Sheet title="Matching starter presets" onClose={onClose}>
      <div className="stack preset-review">
        <p className="muted">{recommendation.reason}</p>
        {recommendation.templates.map((template) => (
          <article className="surface preset-preview" key={template.id}>
            <div className="row">
              <WorkoutIcon template={template} exercises={data.exercises} />
              <div>
                <h3>{template.name}</h3>
                <p className="muted">
                  {template.exercises.length} movements · up to{" "}
                  {template.minutes} min
                </p>
              </div>
            </div>
            <p className="fine-print">
              {template.exercises
                .map(
                  (entry) =>
                    data.exercises.find(
                      (exercise) => exercise.id === entry.exerciseId,
                    )?.name,
                )
                .filter(Boolean)
                .join(" · ")}
            </p>
            {data.templates.some((saved) => saved.id === template.id) && (
              <span className="small muted">
                Already in your library; your saved edits stay intact.
              </span>
            )}
          </article>
        ))}
        {recommendation.templates.length > 0 ? (
          <p className="fine-print">
            Adds these workouts and a reusable{" "}
            {recommendation.program.name.toLowerCase()}. No dates are scheduled
            until you choose Use program.
          </p>
        ) : (
          <p className="muted">
            No compatible starter movements match this inventory. Create a
            custom workout or review your equipment.
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn primary"
          disabled={busy || !available.length}
          onClick={async () => {
            setBusy(true);
            try {
              let count = 0;
              await updateData((draft) => {
                count = addRecommendedPresets(draft, recommendation);
              });
              toast(
                `${count} matching ${count === 1 ? "preset" : "presets"} added`,
              );
              onClose();
            } catch (exception) {
              setError(
                exception instanceof Error
                  ? exception.message
                  : "Unable to add presets.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Adding…"
            : available.length
              ? `Add ${available.length} matching ${available.length === 1 ? "preset" : "presets"}`
              : "Matching presets already added"}
        </button>
      </div>
    </Sheet>
  );
}

function DeleteProgramReview({
  program,
  onCancel,
  onDeleted,
}: {
  program: Program;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const { data } = useApp();
  const impact = programDeletionImpact(data, program.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Sheet title="Delete program" onClose={onCancel}>
      <div className="delete-workout-review">
        <p>
          Permanently delete <strong>{program.name}</strong> from your programs?
        </p>
        <div className="delete-workout-summary">
          <ul>
            <li>Your saved workout templates stay available.</li>
            <li>
              {impact.calendarEntries.length} planned or recorded calendar{" "}
              {impact.calendarEntries.length === 1
                ? "entry stays"
                : "entries stay"}{" "}
              on the same dates, detached from this program.
            </li>
            <li>
              Your completed workout history and active workout stay intact.
            </li>
          </ul>
        </div>
        <p className="muted">
          The reusable rotation is deleted. You can create a new program from
          the same saved workouts.
        </p>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="delete-workout-actions">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Keep program
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={busy || !impact.exists}
            onClick={async () => {
              setBusy(true);
              try {
                await updateData((draft) => {
                  deleteProgram(draft, program.id);
                });
                toast(
                  "Program deleted; workouts, dates and history are preserved",
                );
                onDeleted();
              } catch (exception) {
                setError(
                  exception instanceof Error
                    ? exception.message
                    : "Unable to delete this program.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Delete program"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ProgramEditor({
  program,
  onClose,
}: {
  program: Program;
  onClose: () => void;
}) {
  const { data } = useApp();
  const [draft, setDraft] = useState<Program>(structuredClone(program));
  const [apply, setApply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const patch = (value: Partial<Program>) =>
    setDraft((d) => ({ ...d, ...value }));
  const toggleTemplate = (templateId: string) =>
    patch({
      templateIds: draft.templateIds.includes(templateId)
        ? draft.templateIds.filter((x) => x !== templateId)
        : [...draft.templateIds, templateId],
    });
  const save = async () => {
    const validation = programValidation(draft);
    if (validation) {
      setError(validation);
      return;
    }
    try {
      let count = 0;
      await updateData((d) => {
        const value = { ...draft, name: draft.name.trim() };
        const index = d.programs.findIndex((p) => p.id === draft.id);
        if (index >= 0) d.programs[index] = value;
        else d.programs.push(value);
        if (apply) count = applyProgram(d, value).added;
      });
      toast(
        apply
          ? `Program saved. ${count} sessions added to your calendar.`
          : "Program saved",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save program.");
    }
  };
  return (
    <>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          Program name
          <input
            className="input"
            required
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Your reusable workout rotation"
          />
        </label>
        <label className="field">
          Description
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
        <div className="grid-2">
          <label className="field">
            Start date for scheduling
            <input
              className="input"
              type="date"
              required
              value={draft.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </label>
          <label className="field">
            Schedule length (optional)
            <Select
              className="input"
              value={draft.weeks ?? ""}
              onChange={(e) =>
                patch({
                  weeks: e.target.value ? Number(e.target.value) : undefined,
                  deloadWeek: e.target.value ? draft.deloadWeek : undefined,
                  phases: e.target.value ? draft.phases : undefined,
                })
              }
            >
              <option value="">Reusable rotation — no fixed length</option>
              {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((n) => (
                <option key={n} value={n}>
                  {n} weeks
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            Phase / training emphasis
            <input
              className="input"
              value={draft.phase}
              onChange={(e) => patch({ phase: e.target.value })}
              placeholder="Foundation, strength, accumulation"
            />
          </label>
          <label className="field">
            Planned lighter week
            <Select
              className="input"
              disabled={!draft.weeks}
              value={draft.deloadWeek ?? ""}
              onChange={(e) =>
                patch({
                  deloadWeek: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">None</option>
              {Array.from({ length: draft.weeks ?? 0 }, (_, i) => (
                <option key={i} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <p className="fine-print">
          Programs are reusable rotations, so a length is optional. A schedule
          length controls how many weeks to add to the calendar; it does not
          expire the program.
        </p>
        {draft.weeks && (
          <>
            <p className="muted">
              Schedule through{" "}
              {formatDate(addDays(draft.startDate, draft.weeks * 7 - 1))}. Phase
              targets apply to the corresponding scheduled weeks.
            </p>
            <ProgramPhases
              phases={draft.phases ?? []}
              weeks={draft.weeks}
              onChange={(phases) => patch({ phases })}
            />
          </>
        )}
        <label className="field">Training days</label>
        <div className="chip-row">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <button
              className={`chip ${draft.days.includes(day) ? "active" : ""}`}
              type="button"
              aria-pressed={draft.days.includes(day)}
              key={day}
              onClick={() =>
                patch({
                  days: draft.days.includes(day)
                    ? draft.days.filter((d) => d !== day)
                    : [...draft.days, day],
                })
              }
            >
              {weekdays[day]}
            </button>
          ))}
        </div>
        <h3>Workouts in rotation</h3>
        <p className="muted">
          Select workouts in the order you want them to repeat across training
          days.
        </p>
        {draft.templateIds.length > 0 && (
          <ReorderList
            items={draft.templateIds}
            getId={(templateId) => templateId}
            getLabel={(templateId) =>
              data.templates.find((template) => template.id === templateId)
                ?.name ?? "Unavailable workout"
            }
            onReorder={(templateIds) => patch({ templateIds })}
            ariaLabel="Program workout order"
            renderItem={(templateId, index, handle) => (
              <div className="list-row">
                {handle}
                <span>
                  {index + 1}.{" "}
                  {data.templates.find((template) => template.id === templateId)
                    ?.name ?? "Unavailable workout"}
                </span>
              </div>
            )}
          />
        )}
        {data.templates
          .filter((t) => !t.archived)
          .map((t) => (
            <label className="list-row" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <small className="muted">
                  {t.focus} · {t.minutes} min{" "}
                  {draft.templateIds.includes(t.id)
                    ? `· position ${draft.templateIds.indexOf(t.id) + 1}`
                    : ""}
                </small>
              </div>
              <input
                type="checkbox"
                checked={draft.templateIds.includes(t.id)}
                onChange={() => toggleTemplate(t.id)}
              />
            </label>
          ))}
        <label className="surface row">
          <div>
            <strong>Also schedule dates now</strong>
            <small className="muted">
              Existing sessions are preserved. A rotation without a fixed length
              adds four weeks; use the program later to choose another range.
            </small>
          </div>
          <input
            type="checkbox"
            checked={apply}
            onChange={(e) => setApply(e.target.checked)}
          />
        </label>
        {draft.deloadWeek && apply && (
          <p className="fine-print">
            Lighter sessions use approximately one third fewer sets and 10% less
            target load. This is a planning choice you approve here, not an
            automatic prescription. Edit the created templates for
            exercise-specific needs.
          </p>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <button className="btn primary" type="submit">
          <Check size={18} /> Save program
        </button>
        {data.programs.some((p) => p.id === program.id) && (
          <>
            <button
              className="btn danger"
              type="button"
              onClick={async () => {
                await updateData((d) => {
                  const p = d.programs.find((x) => x.id === program.id);
                  if (p) p.archived = !p.archived;
                });
                toast(
                  program.archived
                    ? "Program restored"
                    : "Program archived; scheduled sessions are preserved",
                );
                onClose();
              }}
            >
              {program.archived ? "Restore program" : "Archive program"}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={17} /> Delete program
            </button>
          </>
        )}
      </form>
      {deleting && (
        <DeleteProgramReview
          program={program}
          onCancel={() => setDeleting(false)}
          onDeleted={onClose}
        />
      )}
    </>
  );
}
