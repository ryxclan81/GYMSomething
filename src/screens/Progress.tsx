import { NumericInput, Select } from "../components/inputs";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Award,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Goal, Session, Suggestion } from "../domain/types";
import { addDays, dateKey, formatDate, id, weekStart } from "../domain/helpers";
import {
  achievements,
  estimated1RM,
  fromKg,
  goalProgress,
  goalValue,
  muscleVolume,
  personalRecords,
  sessionStats,
  strengthTier,
  toKg,
  weeklyStreak,
} from "../domain/engine";
import { useApp, updateData } from "../state/store";
import { Sheet, toast } from "../components/ui";
import {
  BODYWEIGHT_LOSS_SOURCE,
  convertWeightGoalUnit,
  defaultGoalTimeline,
  estimateGoalTimeline,
  firstGoalAchievement,
  recalculateGoalTimeline,
  supportsGoalTimeline,
} from "../domain/goalTimeline";

const goalTypes: Record<Goal["type"], string> = {
  weight: "Weight lifted",
  reps: "Repetition target",
  e1rm: "Estimated 1RM",
  relative: "Strength / bodyweight",
  frequency: "Weekly training days",
  volume: "Weekly muscle sets",
  duration: "Longest cardio duration",
  distance: "Total cardio distance",
  pace: "Fastest cardio pace",
  hold: "Isometric hold",
  skill: "Skill milestone",
  bodyweight: "Bodyweight",
  custom: "Custom numeric goal",
};
const defaultUnit = (type: Goal["type"], unit: "kg" | "lb") =>
  ["weight", "e1rm", "bodyweight"].includes(type)
    ? unit
    : ["reps", "frequency", "volume"].includes(type)
      ? type === "reps"
        ? "reps"
        : type === "frequency"
          ? "days"
          : "sets"
      : type === "relative"
        ? "× BW"
        : type === "distance"
          ? "km"
          : type === "pace"
            ? "min/km"
            : type === "duration"
              ? "min"
              : type === "hold"
                ? "seconds"
                : "points";
const freshGoal = (): Goal => ({
  id: id(),
  name: "",
  type: "weight",
  start: 0,
  current: 0,
  target: 0,
  unit: "kg",
  notes: "",
  history: [],
});

export function Progress({
  onOpenSession,
}: {
  onOpenSession: (session: Session) => void;
}) {
  const { data } = useApp();
  const [tab, setTab] = useState("Overview");
  const [range, setRange] = useState("28");
  const [customFrom, setCustomFrom] = useState(addDays(dateKey(), -28));
  const [customTo, setCustomTo] = useState(dateKey());
  const [chartMetric, setChartMetric] = useState("sets");
  const [exerciseId, setExerciseId] = useState("");
  const [editing, setEditing] = useState<Goal | null>(null);
  const [detail, setDetail] = useState<Goal | null>(null);
  const [recordFilter, setRecordFilter] = useState("");
  const [thresholdExercise, setThresholdExercise] = useState<string | null>(
    null,
  );
  const [bodyEntry, setBodyEntry] = useState(false);
  const all = data.sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
  const from =
    range === "all"
      ? "0000-01-01"
      : range === "today"
        ? dateKey()
        : range === "week"
          ? weekStart()
          : range === "custom"
            ? customFrom
            : addDays(dateKey(), -Number(range) + 1);
  const to = range === "custom" ? customTo : dateKey();
  const filtered = all.filter((s) => {
    const date = dateKey(new Date(s.completedAt!));
    return date >= from && date <= to;
  });
  const target = Math.max(1, data.profile.days.length);
  const total = filtered.reduce(
    (result, s) => {
      const stats = sessionStats(s);
      return {
        sets: result.sets + stats.sets,
        reps: result.reps + stats.reps,
        volume: result.volume + stats.volume,
        duration: result.duration + stats.durationSeconds,
      };
    },
    { sets: 0, reps: 0, volume: 0, duration: 0 },
  );
  const records = personalRecords(filtered).filter(
    (p) => !recordFilter || p.exerciseId === recordFilter,
  );
  const achieved = achievements(all, target);
  const muscles = muscleVolume(
    filtered,
    data.exercises,
    from,
    data.profile.indirectFactor,
  );
  const maxMuscle = Math.max(1, ...muscles.map((m) => m.direct + m.indirect));
  const trainingExercises = data.exercises.filter((e) =>
    all.some((s) => s.exercises.some((x) => x.exerciseId === e.id)),
  );
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const s of filtered) {
      const key = dateKey(new Date(s.completedAt!));
      let value: number;
      if (chartMetric === "strength") {
        const entry = s.exercises.filter((e) => e.exerciseId === exerciseId);
        value = Math.max(
          0,
          ...entry.flatMap((e) =>
            e.sets.map((set) => estimated1RM(set, e.exercise) ?? 0),
          ),
        );
        value = fromKg(value, data.profile.unit);
        if (value === 0) continue;
        grouped.set(key, Math.max(grouped.get(key) ?? 0, value));
      } else {
        const stats = sessionStats(s);
        value =
          chartMetric === "sets"
            ? stats.sets
            : chartMetric === "volume"
              ? fromKg(stats.volume, data.profile.unit)
              : Math.round(stats.durationSeconds / 60);
        grouped.set(key, (grouped.get(key) ?? 0) + value);
      }
    }
    return [...grouped]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, chartMetric, exerciseId, data.profile.unit]);
  const chartUnit =
    chartMetric === "sets"
      ? "working sets"
      : chartMetric === "volume"
        ? `${data.profile.unit} external volume`
        : chartMetric === "strength"
          ? `${data.profile.unit} estimated 1RM`
          : "minutes";
  const liveGoals = data.goals.map((g) => ({
    ...g,
    current: goalValue(g, data),
  }));
  const strengthRecords = personalRecords(all).filter(
    (p) => p.type === "Heaviest load",
  );
  const tiers = strengthRecords.flatMap((record) => {
    const exercise = data.exercises.find((e) => e.id === record.exerciseId);
    if (!exercise || !data.profile.bodyweightKg) return [];
    const tier = strengthTier(
      exercise,
      record.value,
      data.profile.bodyweightKg,
      data.strengthThresholds?.[exercise.id],
    );
    return tier ? [{ exercise, record, tier }] : [];
  });
  return (
    <div className="page progress-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">THE WORK ADDS UP</div>
          <h1>
            Your progress<span className="accent">.</span>
          </h1>
          <p className="muted">Every session tells a story.</p>
        </div>
        <button
          className="btn secondary"
          aria-label="Create a goal"
          onClick={() =>
            setEditing({ ...freshGoal(), unit: data.profile.unit })
          }
        >
          <Plus size={18} />
          <span> Goal</span>
        </button>
      </header>
      <div className="segmented-control">
        {["Overview", "History", "Goals", "Records"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="progress-filter">
        <label className="field">
          <span className="sr-only">Analytics date range</span>
          <Select
            className="input"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="28">Last 4 weeks</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </Select>
        </label>
        <span className="muted">{filtered.length} saved sessions</span>
      </div>
      {range === "custom" && (
        <div className="grid-2">
          <label className="field">
            From
            <input
              className="input"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>
          <label className="field">
            To
            <input
              className="input"
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
        </div>
      )}
      {tab === "Overview" && <SuggestionReview />}
      {tab === "Overview" && (
        <>
          <div className="progress-hero">
            <div>
              <span className="eyebrow">WORKING SETS</span>
              <strong className="hero-number">
                {total.sets}
                <span className="muted"> sets</span>
              </strong>
              <p className="muted">Warm-ups and skipped sets excluded.</p>
            </div>
            <TrendingUp className="accent" size={35} strokeWidth={1.2} />
          </div>
          <div className="stats-grid">
            <div className="metric">
              <span className="muted">Training days</span>
              <strong>
                {
                  new Set(
                    filtered.map((s) => dateKey(new Date(s.completedAt!))),
                  ).size
                }
              </strong>
            </div>
            <div className="metric">
              <span className="muted">Time invested</span>
              <strong>
                {Math.round(total.duration / 60)}
                <small> min</small>
              </strong>
            </div>
            <div className="metric">
              <span className="muted">Repetitions</span>
              <strong>{total.reps.toLocaleString()}</strong>
            </div>
          </div>
          <section className="section">
            <div className="section-heading">
              <h2>Training trend</h2>
              <label>
                <span className="sr-only">Trend metric</span>
                <Select
                  className="input compact"
                  value={chartMetric}
                  onChange={(e) => {
                    setChartMetric(e.target.value);
                    if (e.target.value === "strength" && !exerciseId)
                      setExerciseId(
                        trainingExercises.find(
                          (x) => x.measurement === "weight-reps",
                        )?.id ?? "",
                      );
                  }}
                >
                  <option value="sets">Working sets</option>
                  <option value="volume">Volume load</option>
                  <option value="duration">Duration</option>
                  <option value="strength">Estimated strength</option>
                </Select>
              </label>
            </div>
            {chartMetric === "strength" && (
              <label className="field">
                Exercise
                <Select
                  className="input"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                >
                  <option value="">Choose a lift</option>
                  {trainingExercises
                    .filter((e) => e.measurement === "weight-reps")
                    .map((e) => (
                      <option value={e.id} key={e.id}>
                        {e.name}
                      </option>
                    ))}
                </Select>
              </label>
            )}
            <TrendChart points={chartData} unit={chartUnit} />
            <p className="fine-print">
              {chartMetric === "strength"
                ? "Epley estimates from eligible 1–10-rep sets, in each exercise’s recorded load convention. Estimates are not tested maximums."
                : chartMetric === "volume"
                  ? "External load × repetitions, aggregated by training day. Body mass, assisted resistance, and timed work are excluded; volume is not a measure of muscle growth."
                  : "Totals per saved training day. Days without logged training are omitted."}
            </p>
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>Muscle distribution</h2>
              <span className="eyebrow">
                {range === "week" ? "THIS WEEK" : "SELECTED RANGE"}
              </span>
            </div>
            {muscles.length === 0 ? (
              <p className="muted">
                Log working sets to see where your training is directed.
              </p>
            ) : (
              <>
                <div className="volume-legend">
                  <span>
                    <i className="direct-dot" /> Direct sets
                  </span>
                  <span>
                    <i className="indirect-dot" /> Indirect contribution
                  </span>
                </div>
                {muscles.map((m) => (
                  <div className="muscle-volume-row" key={m.muscle}>
                    <div className="row">
                      <strong>{m.muscle}</strong>
                      <span className="muted">
                        {m.direct} direct + {m.indirect} indirect
                      </span>
                    </div>
                    <div
                      className="volume-track"
                      role="img"
                      aria-label={`${m.muscle}: ${m.direct} direct sets and ${m.indirect} indirect set equivalents`}
                    >
                      <span
                        className="volume-direct"
                        style={{ width: `${(m.direct / maxMuscle) * 100}%` }}
                      />
                      <span
                        className="volume-indirect"
                        style={{ width: `${(m.indirect / maxMuscle) * 100}%` }}
                      />
                    </div>
                    <small className="muted">
                      Trained on {m.frequency}{" "}
                      {m.frequency === 1 ? "day" : "days"}
                    </small>
                  </div>
                ))}
                <p className="fine-print">
                  Primary muscles receive one direct set. Secondary muscles
                  receive {data.profile.indirectFactor.toFixed(2)} set
                  equivalents per working set. Adjust the contribution in your
                  training profile; these are distinct from volume load.
                </p>
              </>
            )}
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>Goals in motion</h2>
              <button className="btn ghost" onClick={() => setTab("Goals")}>
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            {liveGoals.length === 0 ? (
              <button
                className="goal-empty"
                onClick={() =>
                  setEditing({ ...freshGoal(), unit: data.profile.unit })
                }
              >
                <Target size={22} />
                <span>Give your next milestone a name.</span>
                <Plus size={18} />
              </button>
            ) : (
              liveGoals
                .slice(0, 3)
                .map((g) => (
                  <GoalRow key={g.id} goal={g} onClick={() => setDetail(g)} />
                ))
            )}
          </section>
          {data.profile.gamification && (
            <>
              <section className="section">
                <div className="streak-banner">
                  <Flame size={24} strokeWidth={1.5} />
                  <div>
                    <strong>
                      {weeklyStreak(all, target)} week
                      {weeklyStreak(all, target) === 1 ? "" : "s"} of
                      consistency
                    </strong>
                    <p className="muted">
                      {target} training days per week. Planned rest never breaks
                      your rhythm.
                    </p>
                  </div>
                </div>
                <div className="consistency-grid">
                  {Array.from({ length: 8 }, (_, i) => {
                    const start = addDays(weekStart(), -(7 - i) * 7);
                    const count = new Set(
                      all
                        .filter((s) => {
                          const key = dateKey(new Date(s.completedAt!));
                          return (
                            key >= start &&
                            key <= addDays(start, 6) &&
                            sessionStats(s).sets > 0
                          );
                        })
                        .map((s) => dateKey(new Date(s.completedAt!))),
                    ).size;
                    return (
                      <div
                        className={`consistency-week ${count >= target ? "met" : ""}`}
                        key={start}
                        title={`Week of ${formatDate(start)}: ${count} training days, target ${target}`}
                      >
                        <strong>{count}</strong>
                        <small>
                          {formatDate(start, {
                            month: "short",
                            day: "numeric",
                          })}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </section>
              <details className="section milestone-details">
                <summary className="section-heading">
                  <h2>Milestones</h2>
                  <span className="muted">
                    {achieved.filter((a) => a.unlocked).length} earned
                  </span>
                </summary>
                <div className="achievement-list">
                  {achieved.map((a) => (
                    <div
                      className={`achievement-row ${a.unlocked ? "unlocked" : ""}`}
                      key={a.id}
                    >
                      <span className="achievement-icon">
                        <Award size={20} />
                      </span>
                      <div>
                        <strong>{a.name}</strong>
                        <small className="muted">{a.description}</small>
                      </div>
                      {a.unlocked ? (
                        <Check size={17} className="accent" />
                      ) : (
                        <span className="muted">Locked</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
              {tiers.length > 0 && (
                <section className="section">
                  <div className="section-heading">
                    <h2>Relative strength</h2>
                    <span className="eyebrow">OPTIONAL BENCHMARKS</span>
                  </div>
                  {tiers.map(({ exercise, record, tier }) => (
                    <button
                      className="list-row btn ghost"
                      key={exercise.id}
                      onClick={() => setThresholdExercise(exercise.id)}
                    >
                      <div>
                        <strong>{exercise.name}</strong>
                        <small className="muted">
                          {fromKg(record.value, data.profile.unit).toFixed(1)}{" "}
                          {data.profile.unit} recorded load ·{" "}
                          {tier.ratio.toFixed(2)} × bodyweight
                        </small>
                      </div>
                      <span className="chip">{tier.label}</span>
                    </button>
                  ))}
                  <p className="fine-print">
                    Informal motivational ranges for specific barbell lifts.
                    Technique, age, sex, and experience affect comparisons. Tap
                    a lift to customize its thresholds.
                  </p>
                </section>
              )}
            </>
          )}
          <section className="section">
            <div className="section-heading">
              <h2>Bodyweight log</h2>
              <button className="btn ghost" onClick={() => setBodyEntry(true)}>
                <Plus size={15} /> Log
              </button>
            </div>
            {data.bodyMetrics.length === 0 ? (
              <p className="muted">
                Optional measurements stay on your device. Add one to track
                bodyweight goals and relative strength.
              </p>
            ) : (
              <>
                <TrendChart
                  points={[...data.bodyMetrics]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .filter((m) => m.date >= from && m.date <= to)
                    .map((m) => ({
                      date: m.date,
                      value: fromKg(m.weightKg, data.profile.unit),
                    }))}
                  unit={data.profile.unit}
                />
                <p className="muted">
                  Latest:{" "}
                  {fromKg(
                    [...data.bodyMetrics].sort((a, b) =>
                      b.date.localeCompare(a.date),
                    )[0].weightKg,
                    data.profile.unit,
                  ).toFixed(1)}{" "}
                  {data.profile.unit}
                </p>
              </>
            )}
          </section>
        </>
      )}
      {tab === "History" && (
        <section className="section">
          <div className="section-heading">
            <h2>Workout journal</h2>
            <span className="muted">{filtered.length} sessions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Clock3 size={28} />
              <h3>Your history is ahead of you</h3>
              <p className="muted">
                Complete a workout to save your sets, notes, and personal
                records here.
              </p>
            </div>
          ) : (
            [...filtered].reverse().map((s) => {
              const stats = sessionStats(s);
              return (
                <button
                  className="history-row"
                  key={s.id}
                  onClick={() => onOpenSession(s)}
                >
                  <div className="history-date">
                    <strong>{new Date(s.completedAt!).getDate()}</strong>
                    <span className="eyebrow">
                      {new Date(s.completedAt!).toLocaleDateString(undefined, {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <h3>{s.name}</h3>
                    <p className="muted">
                      {stats.sets} sets ·{" "}
                      {Math.round(stats.durationSeconds / 60)} min ·{" "}
                      {s.exercises.length} exercises
                    </p>
                    {s.annotation && (
                      <small className="muted">{s.annotation}</small>
                    )}
                    {s.notes && <small className="muted">{s.notes}</small>}
                  </div>
                  <ChevronRight size={18} />
                </button>
              );
            })
          )}
        </section>
      )}
      {tab === "Goals" && (
        <section className="section">
          <div className="section-heading">
            <h2>Your next milestones</h2>
            <button
              className="btn ghost"
              onClick={() =>
                setEditing({ ...freshGoal(), unit: data.profile.unit })
              }
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="muted">
            Goals use all your saved history. Weekly goals reset with the
            calendar week.
          </p>
          {liveGoals.length === 0 ? (
            <div className="empty-state">
              <Target size={28} />
              <h3>Make progress personal</h3>
              <p className="muted">
                Track a lift, a consistent week, a cardio milestone, or a skill
                of your own.
              </p>
              <button
                className="btn primary"
                onClick={() =>
                  setEditing({ ...freshGoal(), unit: data.profile.unit })
                }
              >
                Create a goal
              </button>
            </div>
          ) : (
            liveGoals.map((g) => (
              <GoalRow key={g.id} goal={g} onClick={() => setDetail(g)} />
            ))
          )}
        </section>
      )}
      {tab === "Records" && (
        <section className="section">
          <div className="section-heading">
            <h2>Personal bests</h2>
            <Award size={21} className="accent" />
          </div>
          <label className="field">
            Exercise
            <Select
              className="input"
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value)}
            >
              <option value="">All movements</option>
              {trainingExercises.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </label>
          <p className="fine-print">
            Records are specific to each exercise, load convention, and selected
            date range. Estimated strength is labeled separately from lifted
            weight.
          </p>
          {records.length === 0 ? (
            <div className="empty-state">
              <Award size={28} />
              <h3>There’s a first for everything</h3>
              <p className="muted">
                Your best performances appear after your first completed
                workout.
              </p>
            </div>
          ) : (
            records.map((record, i) => (
              <div
                className="record-row"
                key={`${record.exerciseId}-${record.type}-${i}`}
              >
                <div>
                  <strong>{record.exerciseName}</strong>
                  <small className="muted">{record.type}</small>
                </div>
                <strong>
                  {record.unit === "kg"
                    ? fromKg(record.value, data.profile.unit).toFixed(1)
                    : record.value.toFixed(
                        record.unit === "min/km"
                          ? 2
                          : record.unit === "km"
                            ? 1
                            : 0,
                      )}{" "}
                  <small className="muted">
                    {record.unit === "kg" ? data.profile.unit : record.unit}
                  </small>
                </strong>
              </div>
            ))
          )}
        </section>
      )}
      {editing && (
        <Sheet
          title={editing.name ? "Edit goal" : "Set a goal"}
          onClose={() => setEditing(null)}
        >
          <GoalEditor goal={editing} onClose={() => setEditing(null)} />
        </Sheet>
      )}
      {detail && (
        <Sheet title={detail.name} onClose={() => setDetail(null)}>
          <GoalDetail
            goal={{ ...detail, current: goalValue(detail, data) }}
            onEdit={() => {
              setEditing(detail);
              setDetail(null);
            }}
            onClose={() => setDetail(null)}
          />
        </Sheet>
      )}
      {thresholdExercise && (
        <Sheet
          title="Customize strength benchmark"
          onClose={() => setThresholdExercise(null)}
        >
          <ThresholdEditor
            exerciseId={thresholdExercise}
            onClose={() => setThresholdExercise(null)}
          />
        </Sheet>
      )}
      {bodyEntry && (
        <Sheet title="Log a measurement" onClose={() => setBodyEntry(false)}>
          <BodyMetricEditor onClose={() => setBodyEntry(false)} />
        </Sheet>
      )}
    </div>
  );
}

const suggestionFields: Record<Suggestion["field"], string> = {
  weightKg: "Target load",
  repMax: "Maximum repetitions",
  sets: "Working sets",
  durationSeconds: "Duration in seconds",
  distanceKm: "Distance in km",
  review: "Training review",
};
function SuggestionReview() {
  const { data } = useApp();
  const [editing, setEditing] = useState<Suggestion | null>(null);
  const [history, setHistory] = useState(false);
  const pending = data.suggestions.filter(
    (s) =>
      s.status === "pending" ||
      (s.status === "snoozed" &&
        s.snoozeUntil &&
        Date.parse(s.snoozeUntil) <= Date.now()),
  );
  const format = (s: Suggestion, value: number) =>
    `${s.field === "weightKg" ? fromKg(value, data.profile.unit).toFixed(1) : Number(value.toFixed(2))}${s.field === "weightKg" ? ` ${data.profile.unit}` : s.field === "durationSeconds" ? " sec" : s.field === "distanceKm" ? " km" : ""}`;
  if (data.suggestions.length === 0) return null;
  return (
    <section className="section">
      <div className="section-heading">
        <h2>Consider your next step</h2>
        <button className="btn ghost" onClick={() => setHistory(!history)}>
          {history ? "Hide decisions" : "Decision history"}
        </button>
      </div>
      {pending.length === 0 && (
        <p className="muted">
          No recommendations waiting. Keep logging and let comparable
          performance guide the next step.
        </p>
      )}
      {pending.map((s) => (
        <article className="suggestion" key={s.id}>
          <div className="row between">
            <span className="eyebrow">
              {s.field === "review" ? "TIME TO REFLECT" : "OPTIONAL NEXT STEP"}
            </span>
            <span className="fine-print">{s.confidence} confidence</span>
          </div>
          <h3>
            {data.exercises.find((e) => e.id === s.exerciseId)?.name ??
              "Exercise"}
          </h3>
          {s.field !== "review" && (
            <p className="suggestion-change">
              {suggestionFields[s.field]}: {format(s, s.current)} →{" "}
              <strong>{format(s, s.proposed)}</strong>
            </p>
          )}
          <p>{s.reason}</p>
          <div className="row">
            <button className="btn primary" onClick={() => setEditing(s)}>
              {s.field === "review" ? "Review options" : "Review & accept"}
            </button>
            <button
              className="btn ghost"
              onClick={async () => {
                await updateData((d) => {
                  const suggestion = d.suggestions.find((x) => x.id === s.id);
                  if (suggestion) suggestion.status = "dismissed";
                });
                toast("Recommendation dismissed");
              }}
            >
              Dismiss
            </button>
            <button
              className="btn ghost"
              onClick={async () => {
                await updateData((d) => {
                  const suggestion = d.suggestions.find((x) => x.id === s.id);
                  if (suggestion) {
                    suggestion.status = "snoozed";
                    const until = new Date();
                    until.setDate(until.getDate() + 7);
                    suggestion.snoozeUntil = until.toISOString();
                  }
                });
                toast("Snoozed for seven days");
              }}
            >
              Snooze 7 days
            </button>
          </div>
        </article>
      ))}
      {history && (
        <div className="stack">
          {[...data.suggestions]
            .reverse()
            .filter((s) => s.status !== "pending")
            .slice(0, 20)
            .map((s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <strong>
                    {data.exercises.find((e) => e.id === s.exerciseId)?.name ??
                      "Exercise"}
                  </strong>
                  <small>
                    {suggestionFields[s.field]}{" "}
                    {s.field !== "review" ? format(s, s.proposed) : ""} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <span className="chip">{s.status}</span>
              </div>
            ))}
        </div>
      )}
      {editing && (
        <Sheet title="Review recommendation" onClose={() => setEditing(null)}>
          <SuggestionEditor
            suggestion={editing}
            onClose={() => setEditing(null)}
          />
        </Sheet>
      )}
    </section>
  );
}

function SuggestionEditor({
  suggestion: s,
  onClose,
}: {
  suggestion: Suggestion;
  onClose: () => void;
}) {
  const { data } = useApp();
  const options = data.templates.filter(
    (t) =>
      !t.archived && t.exercises.some((p) => p.exerciseId === s.exerciseId),
  );
  const [templateId, setTemplateId] = useState(
    options.some((t) => t.id === s.templateId) ? (s.templateId ?? "") : "",
  );
  const [proposed, setProposed] = useState(
    s.field === "weightKg"
      ? Number(fromKg(s.proposed, data.profile.unit).toFixed(2))
      : s.proposed,
  );
  const [error, setError] = useState("");
  const exercise = data.exercises.find((e) => e.id === s.exerciseId);
  const chosen = options
    .find((t) => t.id === templateId)
    ?.exercises.find((p) => p.exerciseId === s.exerciseId);
  const save = async () => {
    const value =
      s.field === "weightKg" ? toKg(proposed, data.profile.unit) : proposed;
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      (["sets", "repMax"].includes(s.field) &&
        (!Number.isInteger(value) || value < 1))
    ) {
      setError(
        "Enter a valid positive target. Sets and repetitions use whole numbers.",
      );
      return;
    }
    try {
      await updateData((d) => {
        const suggestion = d.suggestions.find((x) => x.id === s.id);
        if (!suggestion) return;
        const template = d.templates.find((t) => t.id === templateId);
        const prescription = template?.exercises.find(
          (p) => p.exerciseId === s.exerciseId,
        );
        if (s.field !== "review" && prescription) {
          prescription[s.field] = value;
          if (s.field === "repMax" && prescription.repMin > value)
            prescription.repMin = value;
          template!.updatedAt = new Date().toISOString();
        }
        suggestion.proposed = value;
        suggestion.status = "accepted";
        suggestion.templateId = templateId || suggestion.templateId;
      });
      toast(
        s.field === "review"
          ? "Review acknowledged. Adjust your plan when ready."
          : templateId
            ? "Future workout target updated. Active and completed workouts are preserved."
            : "Recommendation acknowledged; your templates are unchanged.",
      );
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save your decision.",
      );
    }
  };
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>{exercise?.name ?? "Exercise"}</h3>
      <p className="muted">{s.reason}</p>
      {s.field === "review" ? (
        <div className="editorial-note">
          <p>
            Maintaining your targets is a valid choice. Consider checking your
            technique, recent recovery, and weekly workload before deciding
            whether to reduce load, change repetition targets, or plan a lighter
            week. Edit these choices in Plan.
          </p>
        </div>
      ) : (
        <>
          <label className="field">
            {suggestionFields[s.field]}
            {s.field === "weightKg" ? ` (${data.profile.unit})` : ""}
            <NumericInput
              className="input"
              required
              min={
                ["sets", "repMax", "durationSeconds"].includes(s.field) ? 1 : 0
              }
              max={
                s.field === "sets" ? 30 : s.field === "repMax" ? 500 : 100000
              }
              step={["sets", "repMax"].includes(s.field) ? 1 : "any"}
              value={proposed}
              onChange={(e) => setProposed(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Apply to a future workout
            <Select
              className="input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Acknowledge without changing a template</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>
          {chosen && (
            <p className="fine-print">
              Current template target:{" "}
              {s.field === "weightKg"
                ? `${fromKg(chosen.weightKg, data.profile.unit).toFixed(1)} ${data.profile.unit}`
                : chosen[s.field]}
              . Saving replaces this target in{" "}
              {options.find((t) => t.id === templateId)?.name}. Active and
              completed sessions keep their snapshots.
            </p>
          )}
        </>
      )}
      <p className="fine-print">
        This is a configurable rule suggestion with {s.confidence} confidence,
        not a guarantee. You can modify the proposed target or maintain your
        current plan.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <button className="btn primary" type="submit">
        <Check size={17} />{" "}
        {s.field === "review"
          ? "Acknowledge review"
          : templateId
            ? "Accept this target"
            : "Acknowledge suggestion"}
      </button>
      <button className="btn secondary" type="button" onClick={onClose}>
        Keep my current plan
      </button>
    </form>
  );
}

function TrendChart({
  points,
  unit,
}: {
  points: { date: string; value: number }[];
  unit: string;
}) {
  const [focus, setFocus] = useState<number | null>(null);
  if (points.length === 0)
    return (
      <div className="chart-empty">
        <TrendingUp size={25} />
        <p className="muted">Your saved training data will draw this trend.</p>
      </div>
    );
  const w = 640,
    h = 210,
    pad = 35,
    max = Math.max(1, ...points.map((p) => p.value)),
    min = Math.min(0, ...points.map((p) => p.value));
  const x = (i: number) =>
    pad +
    (points.length === 1
      ? (w - pad * 2) / 2
      : (i / (points.length - 1)) * (w - pad * 2));
  const y = (value: number) =>
    h - pad - ((value - min) / (max - min)) * (h - pad * 2);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const selectedIndex =
    focus !== null && focus < points.length ? focus : points.length - 1;
  const selected = points[selectedIndex];
  return (
    <div className="trend-chart">
      <div className="chart-value">
        <strong>
          {selected.value.toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}
        </strong>
        <span className="muted"> {unit}</span>
        <small className="muted">{formatDate(selected.date)}</small>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${unit} trend from ${formatDate(points[0].date)} to ${formatDate(points[points.length - 1].date)}`}
        style={{ width: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient
            id={`chart-${unit.replace(/\W/g, "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="var(--accent, #a8c3ff)"
              stopOpacity="0.12"
            />
            <stop
              offset="100%"
              stopColor="var(--accent, #a8c3ff)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={pad}
              x2={w - pad}
              y1={y(min + (max - min) * v)}
              y2={y(min + (max - min) * v)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="3 6"
            />
            <text
              x={0}
              y={y(min + (max - min) * v) + 4}
              fill="currentColor"
              fontSize="12"
              opacity=".5"
            >
              {Math.round(min + (max - min) * v)}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <path
            d={`${path} L ${x(points.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`}
            fill={`url(#chart-${unit.replace(/\W/g, "")})`}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="var(--accent, #a8c3ff)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === selectedIndex ? 5 : 3}
              fill="var(--accent, #a8c3ff)"
            />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={15}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${formatDate(p.date)}: ${p.value.toFixed(1)} ${unit}`}
              onFocus={() => setFocus(i)}
              onMouseEnter={() => setFocus(i)}
              onClick={() => setFocus(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setFocus(i);
              }}
            >
              <title>
                {formatDate(p.date)}: {p.value.toFixed(1)} {unit}
              </title>
            </circle>
          </g>
        ))}
        <text x={pad} y={h - 5} fill="currentColor" fontSize="12" opacity=".5">
          {formatDate(points[0].date)}
        </text>
        <text
          x={w - pad}
          y={h - 5}
          textAnchor="end"
          fill="currentColor"
          fontSize="12"
          opacity=".5"
        >
          {formatDate(points[points.length - 1].date)}
        </text>
      </svg>
      <details className="chart-data">
        <summary>View chart data</summary>
        <table>
          <caption className="sr-only">{unit} by training date</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={`${p.date}-${i}`}>
                <td>
                  {formatDate(p.date, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td>{p.value.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function GoalRow({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const progress = goalProgress(goal);
  const estimate = estimateGoalTimeline(goal);
  return (
    <button className="goal-row" onClick={onClick}>
      <div className="row">
        <strong>{goal.name}</strong>
        {progress >= 1 ? (
          <Check size={17} className="accent" />
        ) : (
          <ChevronRight size={17} />
        )}
      </div>
      <div className="row">
        <span className="muted">
          {goal.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
          / {goal.target} {goal.unit}
        </span>
        <span className="accent">{Math.round(progress * 100)}%</span>
      </div>
      <div
        className="goal-track"
        role="progressbar"
        aria-label={goal.name}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      {goal.deadline && (
        <small className="muted">
          {goal.timeline?.deadlineMode === "estimated"
            ? "Estimated date"
            : "Target date"}{" "}
          {formatDate(goal.deadline)}
        </small>
      )}
      {estimate && (
        <small className="muted">
          {estimate.weeks.toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}{" "}
          weeks at{" "}
          {estimate.ratePerWeek.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}{" "}
          {goal.unit}/week · planning assumption
        </small>
      )}
    </button>
  );
}

function GoalEditor({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { data } = useApp();
  const [draft, setDraft] = useState<Goal>(() => {
    const initial = structuredClone(goal);
    if (!initial.name && supportsGoalTimeline(initial)) {
      initial.timeline = defaultGoalTimeline(
        initial,
        goalValue(initial, data) || initial.start,
      );
      return recalculateGoalTimeline(initial);
    }
    return initial;
  });
  const [rateEdited, setRateEdited] = useState(Boolean(goal.timeline));
  const [error, setError] = useState("");
  const patch = (value: Partial<Goal>) =>
    setDraft((d) => {
      const next = { ...d, ...value };
      if (next.timeline) {
        if (value.start !== undefined)
          next.timeline = { ...next.timeline, baseline: value.start };
        if (
          !rateEdited &&
          (value.start !== undefined || value.target !== undefined)
        )
          next.timeline = {
            ...next.timeline,
            ratePerWeek: defaultGoalTimeline(next).ratePerWeek,
          };
        return recalculateGoalTimeline(next);
      }
      return next;
    });
  const patchTimeline = (value: Partial<NonNullable<Goal["timeline"]>>) =>
    setDraft((d) =>
      d.timeline
        ? recalculateGoalTimeline({
            ...d,
            timeline: { ...d.timeline, ...value },
          })
        : d,
    );
  const timelineSupported = supportsGoalTimeline(draft);
  const estimate = estimateGoalTimeline(draft);
  const recordedCurrent = goalValue(draft, data);
  const automatic = !["skill", "custom"].includes(draft.type);
  const needsExercise = [
    "weight",
    "reps",
    "e1rm",
    "relative",
    "duration",
    "distance",
    "pace",
    "hold",
  ].includes(draft.type);
  const available = data.exercises.filter(
    (e) =>
      !e.archived &&
      (["duration", "distance", "pace"].includes(draft.type)
        ? e.measurement === "cardio"
        : draft.type === "hold"
          ? e.measurement === "duration"
          : draft.type === "e1rm" || draft.type === "relative"
            ? e.measurement === "weight-reps"
            : !["cardio", "duration"].includes(e.measurement)),
  );
  const save = async () => {
    if (
      !draft.name.trim() ||
      !Number.isFinite(draft.target) ||
      !Number.isFinite(draft.start) ||
      draft.target === draft.start ||
      (timelineSupported && (draft.start < 0 || draft.target <= 0)) ||
      (needsExercise && !draft.exerciseId) ||
      (draft.type === "volume" && !draft.muscle)
    ) {
      setError(
        "Add a name, a target different from the starting value, and the applicable exercise or muscle.",
      );
      return;
    }
    if (draft.timeline && !estimate) {
      setError(
        "Use a positive weekly rate or number of weeks, a valid planning date, and an estimate within 100 years.",
      );
      return;
    }
    try {
      await updateData((d) => {
        const value = { ...draft, name: draft.name.trim() };
        value.current = goalValue(value, d);
        const index = d.goals.findIndex((g) => g.id === value.id);
        if (
          value.history.length === 0 ||
          value.history[value.history.length - 1].value !== value.current
        )
          value.history.push({
            date: new Date().toISOString(),
            value: value.current,
          });
        if (index >= 0) d.goals[index] = value;
        else d.goals.push(value);
      });
      toast("Goal saved");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save goal.");
    }
  };
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="field">
        Goal name
        <input
          className="input"
          required
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="My next milestone"
        />
      </label>
      <label className="field">
        Goal type
        <Select
          className="input"
          value={draft.type}
          onChange={(e) => {
            const type = e.target.value as Goal["type"];
            setRateEdited(false);
            setDraft((d) => {
              const next = {
                ...d,
                type,
                unit: defaultUnit(type, data.profile.unit),
                exerciseId: undefined,
                muscle: undefined,
                timeline: undefined,
                deadline:
                  d.timeline?.deadlineMode === "estimated"
                    ? undefined
                    : d.deadline,
              } as Goal;
              if (type === "bodyweight") {
                const observed = goalValue(next, data);
                if (observed > 0) next.start = observed;
              }
              if (supportsGoalTimeline(next))
                next.timeline = defaultGoalTimeline(
                  next,
                  goalValue(next, data) || next.start,
                );
              return recalculateGoalTimeline(next);
            });
          }}
        >
          {Object.entries(goalTypes).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      {needsExercise && (
        <label className="field">
          Exercise
          <Select
            className="input"
            required
            value={draft.exerciseId ?? ""}
            onChange={(e) =>
              setDraft((d) => {
                const next = { ...d, exerciseId: e.target.value };
                const observed = goalValue(next, data);
                if (!goal.name && observed > 0) next.start = observed;
                if (next.timeline)
                  next.timeline = {
                    ...next.timeline,
                    baseline: observed || next.start,
                  };
                return recalculateGoalTimeline(next);
              })
            }
          >
            <option value="">Choose a movement</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </label>
      )}
      {draft.type === "volume" && (
        <label className="field">
          Muscle
          <Select
            className="input"
            required
            value={draft.muscle ?? ""}
            onChange={(e) => patch({ muscle: e.target.value })}
          >
            <option value="">Choose a muscle</option>
            {[...new Set(data.exercises.flatMap((e) => e.primary))]
              .sort()
              .map((m) => (
                <option key={m}>{m}</option>
              ))}
          </Select>
        </label>
      )}
      <div className="grid-2">
        <label className="field">
          Starting value
          <NumericInput
            className="input"
            step="any"
            required
            value={draft.start}
            onChange={(e) => patch({ start: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Target value
          <NumericInput
            className="input"
            step="any"
            required
            value={draft.target}
            onChange={(e) => patch({ target: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Unit
          {["weight", "e1rm", "bodyweight"].includes(draft.type) ? (
            <Select
              className="input"
              value={draft.unit}
              onChange={(e) =>
                setDraft((d) =>
                  convertWeightGoalUnit(d, e.target.value as "kg" | "lb"),
                )
              }
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </Select>
          ) : draft.type === "distance" ? (
            <Select
              className="input"
              value={draft.unit}
              onChange={(e) => patch({ unit: e.target.value })}
            >
              <option value="km">km</option>
              <option value="mi">mi</option>
            </Select>
          ) : draft.type === "pace" ? (
            <Select
              className="input"
              value={draft.unit}
              onChange={(e) => patch({ unit: e.target.value })}
            >
              <option value="min/km">min/km</option>
              <option value="min/mi">min/mi</option>
            </Select>
          ) : ["duration", "hold"].includes(draft.type) ? (
            <Select
              className="input"
              value={draft.unit}
              onChange={(e) => patch({ unit: e.target.value })}
            >
              <option value="seconds">seconds</option>
              <option value="min">min</option>
            </Select>
          ) : (
            <input
              className="input"
              required
              value={draft.unit}
              readOnly={automatic}
              onChange={(e) => patch({ unit: e.target.value })}
            />
          )}
        </label>
        <label className="field">
          Deadline (optional)
          <input
            className="input"
            type="date"
            value={draft.deadline ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                deadline: e.target.value || undefined,
                timeline: d.timeline
                  ? { ...d.timeline, deadlineMode: "manual" }
                  : undefined,
              }))
            }
          />
        </label>
      </div>
      {timelineSupported && (
        <section
          className="stack goal-timeline"
          aria-label="Goal time estimate"
        >
          <div className="row">
            <h3>Time estimate</h3>
            <label className="check-row">
              <input
                type="checkbox"
                checked={Boolean(draft.timeline)}
                onChange={(e) =>
                  setDraft((d) =>
                    recalculateGoalTimeline({
                      ...d,
                      timeline: e.target.checked
                        ? defaultGoalTimeline(d, recordedCurrent || d.start)
                        : undefined,
                    }),
                  )
                }
              />
              Enable estimate
            </label>
          </div>
          {draft.timeline && (
            <>
              <p className="fine-print">
                Plan from a current weight to your target. This assumes a steady
                rate; actual progress can vary.
              </p>
              <div className="grid-2">
                <label className="field">
                  Current weight for estimate ({draft.unit})
                  <NumericInput
                    className="input"
                    min="0"
                    step="any"
                    required
                    value={draft.timeline.baseline}
                    onChange={(e) =>
                      patchTimeline({ baseline: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  Plan from date
                  <input
                    className="input"
                    type="date"
                    required
                    value={draft.timeline.anchorDate}
                    onChange={(e) =>
                      patchTimeline({ anchorDate: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Weekly weight change ({draft.unit}/week)
                  <NumericInput
                    className="input"
                    min="0.000001"
                    step="any"
                    required
                    value={draft.timeline.ratePerWeek}
                    onChange={(e) => {
                      setRateEdited(true);
                      patchTimeline({
                        mode: "rate",
                        ratePerWeek: Number(e.target.value),
                      });
                    }}
                  />
                </label>
                <label className="field">
                  Planning weeks
                  <NumericInput
                    className="input"
                    min={draft.timeline.mode === "weeks" ? "0.000001" : "0"}
                    max="5200"
                    step="any"
                    value={draft.timeline.weeks}
                    onChange={(e) => {
                      setRateEdited(true);
                      patchTimeline({
                        mode: "weeks",
                        weeks: Number(e.target.value),
                      });
                    }}
                  />
                </label>
              </div>
              {recordedCurrent > 0 && (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => patchTimeline({ baseline: recordedCurrent })}
                >
                  Use recorded current:{" "}
                  {recordedCurrent.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {draft.unit}
                </button>
              )}
              <div className="callout" role="status" aria-live="polite">
                {estimate ? (
                  <>
                    <strong>
                      {estimate.remaining === 0
                        ? "Target reached in this plan"
                        : `About ${estimate.weeks.toLocaleString(undefined, { maximumFractionDigits: 1 })} weeks`}
                    </strong>
                    <p className="muted">
                      Estimated date{" "}
                      {formatDate(estimate.estimatedDate, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {estimate.remaining.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {draft.unit} remaining
                    </p>
                  </>
                ) : (
                  <p>
                    Enter a valid rate or number of weeks to see an estimate.
                  </p>
                )}
              </div>
              <p className="fine-print">
                {draft.timeline.mode === "weeks"
                  ? "Your weeks determine the weekly change. Editing the rate switches back to rate planning. "
                  : "Your weekly change determines the weeks. Editing weeks switches to a fixed duration. "}
                {draft.type === "bodyweight" && draft.target < draft.start ? (
                  <>
                    The initial 0.5 kg/week example is within the CDC's gradual
                    weight-loss context of about 1–2 lb/week.{" "}
                    <a
                      href={BODYWEIGHT_LOSS_SOURCE}
                      target="_blank"
                      rel="noreferrer"
                    >
                      CDC guidance
                    </a>
                    . This is not an individual prescription.
                  </>
                ) : draft.type === "bodyweight" ? (
                  <>
                    The initial 0.25 kg/week gain rate is an editable planning
                    example, not a recommended pace.
                  </>
                ) : (
                  <>
                    The initial 2.5 kg/week lifting rate is an editable planning
                    example, independent of your progression rules. Strength
                    gains are not linear.
                  </>
                )}
              </p>
              {draft.timeline.deadlineMode === "manual" ? (
                <div className="stack">
                  <p className="fine-print">
                    Your chosen date stays fixed when you edit this estimate.
                  </p>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => patchTimeline({ deadlineMode: "estimated" })}
                  >
                    Use estimated date
                  </button>
                </div>
              ) : (
                <p className="fine-print">
                  The deadline follows this estimate. Choose a deadline above to
                  keep your own date.
                </p>
              )}
            </>
          )}
        </section>
      )}
      {!automatic && (
        <label className="field">
          Current value
          <NumericInput
            className="input"
            step="any"
            required
            value={draft.current}
            onChange={(e) => patch({ current: Number(e.target.value) })}
          />
        </label>
      )}
      <label className="field">
        Notes
        <textarea
          className="input"
          rows={3}
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="What this milestone means to you"
        />
      </label>
      <p className="fine-print">
        {automatic
          ? "Current values update from saved workouts and measurements."
          : "Skill and custom goals use the value you log manually."}{" "}
        {draft.type === "relative"
          ? "Relative strength uses an eligible total-load estimated 1RM divided by your profile bodyweight."
          : ""}
        {draft.type === "volume"
          ? "Weekly direct sets plus the configured indirect contribution reset on Monday."
          : ""}
        {draft.type === "pace"
          ? "Use decimal minutes (for example, 5.5 = 5:30). A lower target represents faster pace."
          : ""}
        {draft.type === "duration"
          ? "This tracks your longest recorded cardio set, not total elapsed gym time."
          : ""}
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" type="submit">
        <Check size={17} /> Save goal
      </button>
      {data.goals.some((g) => g.id === goal.id) && (
        <button
          className="btn danger"
          type="button"
          onClick={async () => {
            await updateData((d) => {
              d.goals = d.goals.filter((g) => g.id !== goal.id);
            });
            toast("Goal removed. Workout history is preserved.");
            onClose();
          }}
        >
          Delete goal
        </button>
      )}
    </form>
  );
}

function GoalDetail({
  goal,
  onEdit,
  onClose,
}: {
  goal: Goal;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { data } = useApp();
  const [value, setValue] = useState(goal.current);
  const manual = ["custom", "skill"].includes(goal.type);
  const progress = goalProgress(goal);
  const estimate = estimateGoalTimeline(goal);
  const achievedAt = firstGoalAchievement(goal);
  return (
    <div className="stack">
      <div className="goal-detail-number">
        <span className="muted">{goalTypes[goal.type]}</span>
        <strong>
          {goal.current.toFixed(goal.unit === "× BW" ? 2 : 1)}{" "}
          <small className="muted">{goal.unit}</small>
        </strong>
        <p className="muted">
          Target {goal.target} {goal.unit} · {Math.round(progress * 100)}%
          complete
        </p>
      </div>
      <div className="goal-track">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      {goal.exerciseId && (
        <p className="muted">
          {data.exercises.find((e) => e.id === goal.exerciseId)?.name}
        </p>
      )}
      {goal.muscle && <p className="muted">{goal.muscle}</p>}
      {goal.deadline && (
        <p className="muted">
          {goal.timeline?.deadlineMode === "estimated"
            ? "Estimated date"
            : "Target date"}{" "}
          {formatDate(goal.deadline, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
      {estimate && (
        <div className="callout">
          <strong>
            Time estimate:{" "}
            {estimate.weeks.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}{" "}
            weeks
          </strong>
          <p className="muted">
            From{" "}
            {goal.timeline!.baseline.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            to {goal.target} {goal.unit}, at{" "}
            {estimate.ratePerWeek.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {goal.unit}/week.
          </p>
          <p className="fine-print">
            A planning assumption from{" "}
            {formatDate(goal.timeline!.anchorDate, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            . Edit your goal to revise the current weight, rate, weeks or date.
            Actual progress can vary.
          </p>
        </div>
      )}
      {achievedAt && (
        <p className="muted">
          First reached in goal history:{" "}
          {formatDate(achievedAt, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
      <div className="milestone-strip">
        {[25, 50, 75, 100].map((p) => (
          <div className={progress * 100 >= p ? "reached" : ""} key={p}>
            <Check size={15} />
            <span>{p}%</span>
          </div>
        ))}
      </div>
      <p>{goal.notes}</p>
      <h3>Progress history</h3>
      {goal.history.length === 0 ? (
        <p className="muted">
          Save a measurement or complete a workout to build a timeline.
        </p>
      ) : (
        goal.history
          .slice(-12)
          .reverse()
          .map((h, i) => (
            <div className="row list-row" key={i}>
              <span className="muted">
                {new Date(h.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <strong>
                {h.value.toFixed(1)} {goal.unit}
              </strong>
            </div>
          ))
      )}
      {manual && (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            await updateData((d) => {
              const g = d.goals.find((x) => x.id === goal.id);
              if (g) {
                g.current = value;
                g.history.push({ date: new Date().toISOString(), value });
              }
            });
            toast("Progress logged");
            onClose();
          }}
        >
          <label className="field">
            Log a new value
            <NumericInput
              className="input"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </label>
          <button className="btn primary" type="submit">
            Log progress
          </button>
        </form>
      )}
      <button className="btn secondary" onClick={onEdit}>
        Edit goal
      </button>
    </div>
  );
}

function ThresholdEditor({
  exerciseId,
  onClose,
}: {
  exerciseId: string;
  onClose: () => void;
}) {
  const { data } = useApp();
  const exercise = data.exercises.find((e) => e.id === exerciseId)!;
  const defaultRatios = exercise.name.toLowerCase().includes("bench")
    ? [0, 0.5, 0.75, 1, 1.5]
    : exercise.name.toLowerCase().includes("deadlift")
      ? [0, 1, 1.25, 1.75, 2.5]
      : [0, 0.75, 1, 1.5, 2];
  const [rows, setRows] = useState(
    data.strengthThresholds?.[exerciseId] ??
      ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"].map(
        (label, i) => ({ label, ratio: defaultRatios[i] }),
      ),
  );
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        await updateData((d) => {
          d.strengthThresholds = {
            ...d.strengthThresholds,
            [exerciseId]: rows,
          };
        });
        toast("Benchmark thresholds saved");
        onClose();
      }}
    >
      <h3>{exercise.name}</h3>
      <p className="muted">
        Set the minimum recorded load / bodyweight ratio for each label. These
        are personal motivational ranges and are not scientific classifications.
      </p>
      {rows.map((r, i) => (
        <div className="grid-2" key={i}>
          <label className="field">
            Label
            <input
              className="input"
              required
              value={r.label}
              onChange={(e) =>
                setRows(
                  rows.map((x, n) =>
                    n === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Minimum ratio × bodyweight
            <NumericInput
              className="input"
              min={0}
              max={10}
              step={0.05}
              required
              value={r.ratio}
              onChange={(e) =>
                setRows(
                  rows.map((x, n) =>
                    n === i ? { ...x, ratio: Number(e.target.value) } : x,
                  ),
                )
              }
            />
          </label>
        </div>
      ))}
      <button className="btn primary" type="submit">
        Save thresholds
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={async () => {
          await updateData((d) => {
            if (d.strengthThresholds) delete d.strengthThresholds[exerciseId];
          });
          onClose();
          toast("Default thresholds restored");
        }}
      >
        Restore defaults
      </button>
    </form>
  );
}

function BodyMetricEditor({ onClose }: { onClose: () => void }) {
  const { data } = useApp();
  const [weight, setWeight] = useState(
    data.profile.bodyweightKg
      ? Number(fromKg(data.profile.bodyweightKg, data.profile.unit).toFixed(1))
      : 0,
  );
  const [date, setDate] = useState(dateKey());
  const [note, setNote] = useState("");
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (weight <= 0) return;
        await updateData((d) => {
          const sameDay = d.bodyMetrics.find((m) => m.date === date);
          if (sameDay) {
            sameDay.weightKg = toKg(weight, d.profile.unit);
            sameDay.note = note;
          } else
            d.bodyMetrics.push({
              id: id(),
              date,
              weightKg: toKg(weight, d.profile.unit),
              note,
            });
          const latest = [...d.bodyMetrics].sort((a, b) =>
            b.date.localeCompare(a.date),
          )[0];
          d.profile.bodyweightKg = latest.weightKg;
          for (const goal of d.goals)
            if (goal.type === "bodyweight" || goal.type === "relative") {
              goal.current = goalValue(goal, d);
              goal.history.push({
                date: new Date().toISOString(),
                value: goal.current,
              });
            }
        });
        toast("Measurement saved");
        onClose();
      }}
    >
      <label className="field">
        Bodyweight ({data.profile.unit})
        <NumericInput
          className="input"
          min={1}
          max={1500}
          step={0.1}
          required
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />
      </label>
      <label className="field">
        Date
        <input
          className="input"
          type="date"
          required
          max={dateKey()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="field">
        Notes
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <p className="fine-print">
        Your latest measurement updates profile bodyweight and related goal
        calculations. Measurements stay local and are included in your backup.
      </p>
      <button className="btn primary" type="submit">
        <Check size={17} /> Save measurement
      </button>
    </form>
  );
}
