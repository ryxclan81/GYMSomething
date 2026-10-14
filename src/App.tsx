import Welcome from "./components/Welcome";
import {
  sortTemplates,
  templateSortOptions,
  type TemplateSort,
} from "./domain/templates";
import { Brand as Logo } from "./components/Brand";
import { useHorizontalSwipe } from "./components/useHorizontalSwipe";
import WorkoutIcon from "./components/WorkoutIcon";
import Onboarding from "./components/Onboarding";
import { DailyWorkouts } from "./components/DailyWorkouts";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Home as HomeIcon,
  Dumbbell,
  CalendarDays,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronLeft,
  WifiOff,
  Plus,
  MapPin,
  Download,
  Utensils,
} from "lucide-react";
import { useApp, updateData, exportBackup } from "./state/store";
import type { Session, Template } from "./domain/types";
import { Select } from "./components/inputs";
import { createSession } from "./domain/session";
import {
  equipmentCompatibility,
  substitutions,
  substitutionDetails,
  adaptWorkoutSession,
  type SessionAdaptation,
  sessionStats,
  weeklyStreak,
  fromKg,
} from "./domain/engine";
import { dateKey, weekStart, addDays, formatDate } from "./domain/helpers";
import {
  Button,
  Empty,
  Field,
  IconButton,
  Sheet,
  toast,
  Toasts,
} from "./components/ui";
const Workout = lazy(() => import("./screens/Workout"));
import { completeSpotifyCallback } from "./integrations/spotify";
import { inAppReminder } from "./integrations/reminders";
const Plan = lazy(() =>
  import("./screens/Plan").then((m) => ({ default: m.Plan })),
);
const Progress = lazy(() =>
  import("./screens/Progress").then((m) => ({ default: m.Progress })),
);
const Library = lazy(() =>
  import("./screens/Library").then((m) => ({ default: m.Library })),
);
const Settings = lazy(() => import("./screens/Settings"));
const Nutrition = lazy(() => import("./screens/Nutrition"));
type Tab =
  | "home"
  | "train"
  | "plan"
  | "progress"
  | "library"
  | "settings"
  | "nutrition"
  | "workout"
  | "summary";
const mainTabs = [
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "train", label: "Workouts", icon: Dumbbell },
  { key: "plan", label: "Plan", icon: CalendarDays },
  { key: "progress", label: "Progress", icon: ChartNoAxesCombined },
  { key: "nutrition", label: "Nutrition", icon: Utensils },
] as const;
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="page">
          <h1>Let’s get you back.</h1>
          <p className="muted">
            A screen encountered an error. Your saved training data remains in
            this browser.
          </p>
          <Button onClick={() => location.reload()}>Reload Setwise</Button>
        </div>
      );
    return this.props.children;
  }
}
export default function App() {
  const { data, ready, error, saving } = useApp();
  const [tab, setTab] = useState<Tab>("home"),
    [equipmentOpen, setEquipmentOpen] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [summary, setSummary] = useState<Session | null>(null),
    [lastSaved, setLastSaved] = useState<Session | null>(null),
    [editing, setEditing] = useState<Session | null>(null);
  const [exerciseFocused, setExerciseFocused] = useState(false);
  const [settingsPane, setSettingsPane] = useState<"equipment" | undefined>();
  const [startingSetup, setStartingSetup] = useState(false);
  const activeNavTab =
    tab === "workout" ? "home" : tab === "library" ? "train" : tab;
  const [adapt, setAdapt] = useState<{
      template: Template;
      scheduleId?: string;
    } | null>(null),
    [choices, setChoices] = useState<Record<string, string>>({});
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    completeSpotifyCallback()
      .then((connected) => {
        if (connected) toast("Spotify connected.");
      })
      .catch((e) => toast(e.message));
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document
      .querySelector(".app-content")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  useEffect(() => {
    document.documentElement.dataset.accent = data.profile.accent ?? "sage";
    document.documentElement.dataset.density =
      data.profile.density ?? "comfortable";
  }, [data.profile.accent, data.profile.density]);
  const equipment =
    data.equipment.find((e) => e.id === data.activeEquipmentId) ??
    data.equipment[0];
  function navigate(next: Tab) {
    if (next === "settings") setSettingsPane(undefined);
    setExerciseFocused(false);
    setEditing(null);
    setTab(next);
  }
  async function begin(template?: Template, scheduleId?: string) {
    if (data.activeSession) {
      setTab("workout");
      toast("Your existing workout is ready to resume.");
      return;
    }
    if (template) {
      const unavailable = template.exercises.filter((p) => {
        const ex = data.exercises.find((e) => e.id === p.exerciseId);
        return (
          ex && !equipmentCompatibility(ex, equipment, p.weightKg).compatible
        );
      });
      if (unavailable.length) {
        setChoices({});
        setAdapt({ template, scheduleId });
        return;
      }
    }
    try {
      const session = createSession(data, template, scheduleId);
      await updateData((d) => {
        d.activeSession = session;
      });
      setTab("workout");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not start workout.");
    }
  }
  async function beginAdapted() {
    if (!adapt) return;
    try {
      const decisions: Record<string, SessionAdaptation> = Object.fromEntries(
        Object.entries(choices)
          .filter(([, value]) => value)
          .map(([key, value]) => [
            key,
            value === "__skip__"
              ? { kind: "skip" }
              : { kind: "substitute", exerciseId: value },
          ]),
      );
      const session = adaptWorkoutSession(
        createSession(data, adapt.template, adapt.scheduleId),
        decisions,
        data.exercises,
        equipment,
        data.profile.avoid,
      );
      await updateData((d) => {
        d.activeSession = session;
      });
      setAdapt(null);
      setTab("workout");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "The workout could not be saved.",
      );
    }
  }
  function finished(session: Session) {
    setSummary(session);
    const corrected = Boolean(editing);
    setEditing(null);
    setExerciseFocused(false);
    if (corrected) {
      setTab("summary");
    } else {
      setLastSaved(session);
      setTab("home");
      toast("Workout saved. Choose your next workout when you’re ready.");
    }
  }
  if (!ready)
    return (
      <div className="launch">
        <Logo />
        <p className="muted">Getting your training ready…</p>
      </div>
    );
  if (
    !error &&
    !data.profile.onboardingComplete &&
    !data.profile.welcomeStarted
  )
    return (
      <ErrorBoundary>
        <Welcome
          busy={startingSetup}
          onStart={() => {
            setStartingSetup(true);
            void updateData((draft) => {
              draft.profile.welcomeStarted = true;
            })
              .catch(() =>
                toast("Setup could not be saved. Check your browser storage."),
              )
              .finally(() => setStartingSetup(false));
          }}
        />
        <Toasts />
      </ErrorBoundary>
    );
  return (
    <ErrorBoundary>
      <div
        className={`app-shell ${tab === "workout" && exerciseFocused ? "focus-mode" : ""}`}
        data-saving={saving}
      >
        <aside className="sidebar">
          <Logo onHome={() => navigate("home")} />
          <nav aria-label="Main navigation">
            {mainTabs.map((t) => (
              <button
                key={t.key}
                aria-current={activeNavTab === t.key ? "page" : undefined}
                className={activeNavTab === t.key ? "selected" : ""}
                onClick={() => navigate(t.key)}
              >
                <t.icon size={20} />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={() => navigate("settings")}>
              <SettingsIcon size={19} /> Settings
            </button>
          </div>
        </aside>
        <div className="app-content">
          <header className="app-header">
            <div className="mobile-logo">
              <Logo onHome={() => navigate("home")} />
            </div>
            <div className="desktop-location">Training journal</div>
            <div className="header-controls">
              {offline && (
                <span className="offline-state">
                  <WifiOff size={14} />
                  <span>Offline</span>
                </span>
              )}
              <button
                className="icon-btn equipment-switch equipment-selector"
                data-help-topic="equipment"
                aria-label={`Training equipment: ${equipment?.name}`}
                onClick={() => setEquipmentOpen(true)}
              >
                <MapPin size={20} aria-hidden="true" />
              </button>
              <IconButton
                className="mobile-settings"
                label="Settings"
                onClick={() => navigate("settings")}
              >
                <SettingsIcon size={20} />
              </IconButton>
            </div>
          </header>
          {error && (
            <div className="storage-error" role="alert">
              <strong>Storage needs attention.</strong> {error}
              <button
                onClick={() => {
                  const blob = new Blob([exportBackup()], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `setwise-recovery-${dateKey()}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Export recovery backup
              </button>
            </div>
          )}
          {data.activeSession && tab !== "workout" && (
            <button className="resume-banner" onClick={() => setTab("workout")}>
              <span className="pulse" />
              <span>
                {data.activeSession.name}
                <small>
                  Workout in progress ·{" "}
                  {error
                    ? "Unsaved changes — export a backup"
                    : saving
                      ? "Saving…"
                      : "Saved on this device"}
                </small>
              </span>
              <span>
                Resume <ArrowRight size={16} />
              </span>
            </button>
          )}
          <main id="main-content">
            <Suspense
              fallback={
                <div className="page">
                  <p className="muted">Opening your journal…</p>
                </div>
              }
            >
              {tab === "home" && (
                <Home
                  onTrain={() => navigate("train")}
                  onPlan={() => navigate("plan")}
                  onProgress={() => navigate("progress")}
                  onStart={begin}
                  onBackup={() => navigate("settings")}
                  savedSession={
                    data.sessions.find(
                      (session) => session.id === lastSaved?.id,
                    ) ?? null
                  }
                  onReviewSaved={() => {
                    const saved = data.sessions.find(
                      (session) => session.id === lastSaved?.id,
                    );
                    if (saved) {
                      setSummary(saved);
                      setTab("summary");
                    }
                  }}
                />
              )}
              {tab === "train" && (
                <Workouts
                  onLibrary={() => navigate("library")}
                  onPlan={() => navigate("plan")}
                  onStart={begin}
                />
              )}
              {tab === "plan" && <Plan onStart={begin} />}
              {tab === "progress" && (
                <Progress
                  onOpenSession={(s) => {
                    setSummary(s);
                    setTab("summary");
                  }}
                />
              )}
              {tab === "library" && (
                <Library onBack={() => navigate("train")} />
              )}
              {tab === "settings" && (
                <Settings
                  key={settingsPane ?? "main"}
                  initialPane={settingsPane}
                  onBack={() => navigate("home")}
                  onNutrition={() => navigate("nutrition")}
                />
              )}
              {tab === "nutrition" && (
                <Nutrition onBack={() => navigate("home")} />
              )}
              {tab === "workout" && (editing || data.activeSession) && (
                <Workout
                  session={editing ?? data.activeSession!}
                  history={!!editing}
                  onBack={() => navigate("home")}
                  onComplete={finished}
                  onFocusChange={setExerciseFocused}
                />
              )}
              {tab === "summary" && summary && (
                <Summary
                  session={
                    data.sessions.find((s) => s.id === summary.id) ?? summary
                  }
                  onBack={() => navigate("progress")}
                  onEdit={() => {
                    setEditing(summary);
                    setTab("workout");
                  }}
                />
              )}
            </Suspense>
          </main>
          <footer className="desktop-footer">
            <span>Setwise</span>
            <span>
              {error
                ? "Unsaved changes"
                : saving
                  ? "Saving your changes…"
                  : "Saved on this device"}
            </span>
          </footer>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {mainTabs.map((t) => (
            <button
              key={t.key}
              aria-current={activeNavTab === t.key ? "page" : undefined}
              className={activeNavTab === t.key ? "selected" : ""}
              onClick={() => navigate(t.key)}
            >
              <t.icon size={21} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <Toasts />
        {!data.profile.onboardingComplete && !error && <Onboarding />}
        {equipmentOpen && (
          <Sheet
            title="Where are you training?"
            onClose={() => setEquipmentOpen(false)}
          >
            <p className="muted">
              Your templates stay the same. Unavailable movements can be adapted
              for each session.
            </p>
            {data.equipment.map((e) => (
              <button
                className={`list-row full ${e.id === data.activeEquipmentId ? "chosen" : ""}`}
                key={e.id}
                onClick={() => {
                  void updateData((d) => {
                    d.activeEquipmentId = e.id;
                  });
                  setEquipmentOpen(false);
                }}
              >
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.items.length
                      ? `${e.items.length} equipment types`
                      : "Bodyweight only"}
                  </small>
                </span>
                {e.id === data.activeEquipmentId ? (
                  <Check size={20} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            ))}
            <Button
              variant="secondary"
              className="full"
              onClick={() => {
                setEquipmentOpen(false);
                setSettingsPane("equipment");
                setTab("settings");
              }}
            >
              Manage equipment
            </Button>
          </Sheet>
        )}
        {adapt && (
          <Sheet title="Make this workout yours" onClose={() => setAdapt(null)}>
            <p className="muted">
              A few movements need different equipment at {equipment.name}.
              Choose substitutes for this session. Each substitute starts with
              its own history.
            </p>
            {adapt.template.exercises
              .filter((p) => {
                const ex = data.exercises.find((e) => e.id === p.exerciseId);
                return (
                  ex &&
                  !equipmentCompatibility(ex, equipment, p.weightKg).compatible
                );
              })
              .map((p) => {
                const ex = data.exercises.find((e) => e.id === p.exerciseId)!;
                const options = substitutions(
                  ex,
                  data.exercises.filter(
                    (e) =>
                      !data.profile.avoid.some(
                        (value) =>
                          value === e.id ||
                          value.toLowerCase() === e.name.toLowerCase(),
                      ),
                  ),
                  equipment,
                  data.profile.avoid,
                ).slice(0, 20);
                return (
                  <Field
                    label={ex.name}
                    key={p.id}
                    hint={equipmentCompatibility(
                      ex,
                      equipment,
                      p.weightKg,
                    ).reasons.join(" · ")}
                  >
                    <Select
                      value={choices[p.id] ?? ""}
                      onChange={(e) =>
                        setChoices({ ...choices, [p.id]: e.target.value })
                      }
                    >
                      <option value="">Choose a substitute or skip</option>
                      <option value="__skip__">
                        Skip this exercise for this workout
                      </option>
                      {equipmentCompatibility(ex, equipment).compatible && (
                        <option value={ex.id}>
                          {ex.name} · choose a lower load during this session
                        </option>
                      )}
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} · {substitutionDetails(ex, o).reason}
                        </option>
                      ))}
                    </Select>
                    {!options.length && (
                      <span className="small muted">
                        No equipment-compatible alternative is available. You
                        can skip this exercise and continue the workout.
                      </span>
                    )}
                  </Field>
                );
              })}
            <Button
              className="full"
              onClick={() => {
                void beginAdapted();
              }}
            >
              Start adapted workout
            </Button>
          </Sheet>
        )}
      </div>
    </ErrorBoundary>
  );
}
function Home({
  onTrain,
  onPlan,
  onProgress,
  onStart,
  onBackup,
  savedSession,
  onReviewSaved,
}: {
  onTrain: () => void;
  onPlan: () => void;
  onProgress: () => void;
  onStart: (t: Template, s?: string) => void;
  onBackup: () => void;
  savedSession: Session | null;
  onReviewSaved: () => void;
}) {
  const { data } = useApp();
  const [selectedDay, setSelectedDay] = useState(dateKey());
  const today = dateKey(),
    week = weekStart();
  const [shownWeek, setShownWeek] = useState(week);
  const changeWeek = (direction: number) => {
    setShownWeek((current) => addDays(current, direction * 7));
    setSelectedDay((current) => addDays(current, direction * 7));
  };
  const swipe = useHorizontalSwipe({
    onPrevious: () => changeWeek(-1),
    onNext: () => changeWeek(1),
  });
  const weekSessions = data.sessions.filter(
    (session) =>
      session.completedAt &&
      dateKey(new Date(session.completedAt)) >= week &&
      dateKey(new Date(session.completedAt)) <= today,
  );
  const target = data.profile.days.length || 3;
  const trainingDays = new Set(
    weekSessions.map((session) => dateKey(new Date(session.completedAt!))),
  ).size;
  const progress = Math.min(1, trainingDays / target);
  const last = data.sessions.at(-1);
  const reminder = inAppReminder(data);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const upcoming = data.schedule
    .filter((entry) => entry.status === "planned" && entry.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  return (
    <div className="page home-page">
      <header className="page-header">
        <div>
          <p className="home-date muted">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>
            {greeting}
            {data.profile.name ? `, ${data.profile.name.split(" ")[0]}` : ""}
          </h1>
        </div>
      </header>
      {reminder && (
        <div className="editorial-note" role="status">
          {reminder.message}
        </div>
      )}
      {savedSession && (
        <div className="section-heading saved-workout-feedback">
          <span className="small muted">Saved · {savedSession.name}</span>
          <button className="text-btn" onClick={onReviewSaved}>
            Review saved workout
          </button>
        </div>
      )}
      <div className="home-layout">
        <div className="home-main">
          <div className="calendar-period-controls">
            <IconButton label="Previous week" onClick={() => changeWeek(-1)}>
              <ChevronLeft size={18} aria-hidden="true" />
            </IconButton>
            <span aria-live="polite">
              {formatDate(shownWeek, { month: "short", day: "numeric" })} –{" "}
              {formatDate(addDays(shownWeek, 6), {
                month: "short",
                day: "numeric",
              })}
            </span>
            <IconButton label="Next week" onClick={() => changeWeek(1)}>
              <ChevronRight size={18} aria-hidden="true" />
            </IconButton>
          </div>
          <div
            className="home-day-picker"
            aria-label="This week's workouts"
            {...swipe}
          >
            {Array.from({ length: 7 }, (_, i) => {
              const day = addDays(shownWeek, i);
              const completed = data.sessions.some(
                (session) =>
                  session.completedAt &&
                  dateKey(new Date(session.completedAt)) === day,
              );
              const planned = data.schedule.some(
                (entry) => entry.date === day && entry.status === "planned",
              );
              return (
                <button
                  key={day}
                  aria-label={formatDate(day, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  aria-pressed={selectedDay === day}
                  className={`day-cell ${selectedDay === day ? "selected" : ""}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span>{formatDate(day, { weekday: "short" })}</span>
                  <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
                  <span
                    className={`day-marker ${completed ? "done" : planned ? "planned" : ""}`}
                    aria-label={
                      completed
                        ? "Training recorded"
                        : planned
                          ? "Workout planned"
                          : "No workout planned"
                    }
                  >
                    {completed ? <Check size={11} aria-hidden="true" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <DailyWorkouts
            day={selectedDay}
            onStart={onStart}
            onPlan={onPlan}
            onReview={onProgress}
          />
          <div className="home-actions">
            <button className="text-btn" onClick={onTrain}>
              <Plus size={17} aria-hidden="true" /> Start an unscheduled workout
            </button>
          </div>
          {upcoming.length > 0 && (
            <section className="upcoming-workouts">
              <div className="section-heading">
                <h2>Coming up</h2>
                <button className="text-btn" onClick={onPlan}>
                  View calendar
                </button>
              </div>
              {upcoming.map((entry) => (
                <button
                  className="upcoming-workout"
                  key={entry.id}
                  onClick={() => setSelectedDay(entry.date)}
                >
                  <span>
                    {formatDate(entry.date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <strong>
                    {
                      data.templates.find(
                        (template) => template.id === entry.templateId,
                      )?.name
                    }
                  </strong>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              ))}
            </section>
          )}
        </div>
        <aside className="home-insights" aria-label="Training summary">
          <section className="week-summary">
            <div className="section-heading">
              <h2>This week</h2>
              <button className="text-btn" onClick={onProgress}>
                Progress
              </button>
            </div>
            <p className="week-summary-count">
              <strong>{trainingDays}</strong>
              <span>of {target} training days</span>
            </p>
            <progress
              value={trainingDays}
              max={Math.max(target, trainingDays)}
              aria-label="Weekly training-day progress"
            />
            <p className="muted small">
              {Math.round(progress * 100)}% of weekly target
            </p>
            <div className="home-metrics">
              <div>
                <strong>{data.sessions.length}</strong>
                <span>Saved workouts</span>
              </div>
              {data.profile.gamification && (
                <div>
                  <strong>{weeklyStreak(data.sessions, target)}</strong>
                  <span>Consistent weeks</span>
                </div>
              )}
            </div>
          </section>
          {last && (
            <section className="recent-home">
              <h2>Last workout</h2>
              <h3>{last.name}</h3>
              <p className="muted">
                {formatDate(dateKey(new Date(last.completedAt!)))}
              </p>
              <button className="text-btn" onClick={onProgress}>
                View history <ChevronRight size={16} aria-hidden="true" />
              </button>
            </section>
          )}
          {!data.lastBackup && data.sessions.length > 0 && (
            <button className="backup-reminder" onClick={onBackup}>
              <Download size={18} aria-hidden="true" />
              <span>
                Back up your records<small>Download a copy in Settings.</small>
              </span>
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
function Workouts({
  onLibrary,
  onPlan,
  onStart,
}: {
  onLibrary: () => void;
  onPlan: () => void;
  onStart: (t?: Template, scheduleId?: string) => void;
}) {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TemplateSort>("recent");
  const equipment = data.equipment.find(
    (item) => item.id === data.activeEquipmentId,
  )!;
  const templates = sortTemplates(
    data.templates.filter(
      (template) =>
        !template.archived &&
        `${template.name} ${template.focus}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
    sort,
  );
  return (
    <div className="page train-page">
      <header className="page-header">
        <div>
          <h1>Your workouts.</h1>
          <p className="muted">Reusable workouts, ready when you need them.</p>
        </div>
        <Button variant="secondary" onClick={onLibrary}>
          <Dumbbell size={18} aria-hidden="true" /> Exercise library
        </Button>
      </header>
      <section className="workout-library">
        <div className="section-heading">
          <h2>Workout library</h2>
          <button className="text-btn" onClick={onPlan}>
            <Plus size={16} aria-hidden="true" /> Create / edit
          </button>
        </div>
        <Field label="Search workouts">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or training focus"
          />
        </Field>
        <Field label="Sort workouts">
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as TemplateSort)}
          >
            {templateSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="template-grid">
          {templates.map((template) => {
            const missing = template.exercises.filter((prescription) => {
              const exercise = data.exercises.find(
                (item) => item.id === prescription.exerciseId,
              );
              return (
                exercise &&
                !equipmentCompatibility(
                  exercise,
                  equipment,
                  prescription.weightKg,
                ).compatible
              );
            }).length;
            return (
              <article className="template-card" key={template.id}>
                <div className="template-card-heading">
                  <div className="template-title">
                    <span className="template-muscle-icon">
                      <WorkoutIcon
                        template={template}
                        exercises={data.exercises}
                        size={38}
                      />
                    </span>
                    <div>
                      <h3>{template.name}</h3>
                      <span className="muted">{template.focus}</span>
                    </div>
                  </div>
                  <span className="muted">{template.minutes} min</span>
                </div>
                <p className="muted small template-description">
                  {template.description}
                </p>
                <details className="template-exercises">
                  <summary>{template.exercises.length} exercises</summary>
                  <div className="template-movements">
                    {template.exercises.map((prescription) => {
                      const exercise = data.exercises.find(
                        (item) => item.id === prescription.exerciseId,
                      );
                      return (
                        <div key={prescription.id}>
                          <strong>{exercise?.name}</strong>
                          <span>{exercise?.primary.join(", ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
                {missing > 0 && (
                  <p className="small warning">
                    {missing} movement{missing === 1 ? "" : "s"} to adapt for
                    this equipment
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="full"
                  onClick={() => onStart(template)}
                >
                  {missing ? "Adapt & start" : "Start workout"}
                  <ChevronRight size={17} aria-hidden="true" />
                </Button>
              </article>
            );
          })}
        </div>
        {!templates.length && (
          <Empty
            title="No matching workouts"
            description="Try a different name or create a workout in Plan."
          />
        )}
      </section>
      <section className="open-workout">
        <div>
          <h2>Unscheduled workout</h2>
          <p className="muted">Choose exercises as you go.</p>
        </div>
        <Button variant="secondary" onClick={() => onStart()}>
          Start <Plus size={18} aria-hidden="true" />
        </Button>
      </section>
    </div>
  );
}
function Summary({
  session,
  onBack,
  onEdit,
}: {
  session: Session;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { data } = useApp();
  const stats = sessionStats(session);
  return (
    <div className="page summary-page">
      <p className="eyebrow">
        SESSION SAVED · {formatDate(dateKey(new Date(session.completedAt!)))}
      </p>
      <div className="summary-check">
        <Check size={30} />
      </div>
      <h1>
        Work put in<span className="accent">.</span>
      </h1>
      <p className="muted">{session.name}</p>
      <div className="summary-stats">
        <div>
          <strong>{Math.round(stats.durationSeconds / 60)}</strong>
          <span>minutes</span>
        </div>
        <div>
          <strong>{stats.sets}</strong>
          <span>working sets</span>
        </div>
        <div>
          <strong>{stats.reps}</strong>
          <span>repetitions</span>
        </div>
      </div>
      <div className="section-heading">
        <h2>The session</h2>
        <span className="muted small">
          {Math.round(fromKg(stats.volume, data.profile.unit)).toLocaleString()}{" "}
          {data.profile.unit} external volume
        </span>
      </div>
      {session.exercises.map((e) => (
        <div className="list-row" key={e.id}>
          <div>
            <strong>{e.exercise.name}</strong>
            <small className="muted">
              {e.sets
                .filter((s) => s.completed && !s.skipped)
                .map((s) =>
                  e.exercise.measurement === "duration" ||
                  e.exercise.measurement === "cardio"
                    ? `${Math.round((s.durationSeconds / 60) * 10) / 10} min${s.distanceKm ? ` · ${s.distanceKm} km` : ""}`
                    : e.exercise.load === "none"
                      ? `${s.reps} reps`
                      : `${Math.round(fromKg(s.weightKg, data.profile.unit) * 10) / 10} ${data.profile.unit} × ${s.reps}`,
                )
                .join(" / ") || "Not completed"}
            </small>
          </div>
          <Check size={18} className="accent" />
        </div>
      ))}
      {session.notes && <p className="session-notes">“{session.notes}”</p>}
      <div className="grid-2 section">
        <Button variant="secondary" onClick={onEdit}>
          Edit workout
        </Button>
        <Button onClick={onBack}>
          View progress <ArrowUpRight size={18} />
        </Button>
      </div>
      <p className="small muted">
        Saved on this device. Progression suggestions, when triggered, are
        waiting in Progress.
      </p>
    </div>
  );
}
