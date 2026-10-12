import { Select } from "../components/inputs";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  Heart,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Exercise, Measurement } from "../domain/types";
import { id, prescription } from "../domain/helpers";
import {
  equipmentCompatibility,
  fromKg,
  personalRecords,
  substitutions,
} from "../domain/engine";
import { useApp, updateData } from "../state/store";
import { Sheet, toast } from "../components/ui";
import { NumberField, RuleEditor } from "./TrainingRules";
import { searchExercises } from "../domain/search";

const splitList = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const newExercise = (): Exercise => ({
  id: id(),
  name: "",
  aliases: [],
  category: "Strength",
  primary: [],
  secondary: [],
  pattern: "",
  equipment: [],
  difficulty: "Beginner",
  measurement: "weight-reps",
  load: "total",
  description: "",
  instructions: [],
  mistakes: [],
  safety: "",
  source: "Personal exercise",
  license: "User supplied",
  alternatives: [],
  custom: true,
  notes: "",
  tags: [],
});

function ListInput({
  label,
  value,
  onChange,
  placeholder,
  list,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  list?: string;
}) {
  const [raw, setRaw] = useState(value.join(", "));
  return (
    <label className="field">
      {label}
      <input
        className="input"
        value={raw}
        list={list}
        placeholder={placeholder}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(splitList(e.target.value));
        }}
      />
    </label>
  );
}

export function Library({
  onBack,
  onPick,
}: {
  onBack?: () => void;
  onPick?: (exercise: Exercise) => void;
}) {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const [filters, setFilters] = useState(false);
  const [muscle, setMuscle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [equipment, setEquipment] = useState("");
  const [pattern, setPattern] = useState("");
  const [available, setAvailable] = useState(false);
  const [bodyweight, setBodyweight] = useState(false);
  const [hideAvoided, setHideAvoided] = useState(false);
  const [archived, setArchived] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [custom, setCustom] = useState(false);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [add, setAdd] = useState<Exercise | null>(null);
  const environment = data.equipment.find(
    (e) => e.id === data.activeEquipmentId,
  );
  const missing = (e: Exercise) =>
    environment ? equipmentCompatibility(e, environment).reasons : [];
  const muscles = useMemo(
    () => [...new Set(data.exercises.flatMap((e) => e.primary))].sort(),
    [data.exercises],
  );
  const categories = useMemo(
    () => [...new Set(data.exercises.map((e) => e.category))].sort(),
    [data.exercises],
  );
  const equipmentTypes = useMemo(
    () => [...new Set(data.exercises.flatMap((e) => e.equipment))].sort(),
    [data.exercises],
  );
  const patterns = useMemo(
    () =>
      [...new Set(data.exercises.map((e) => e.pattern).filter(Boolean))].sort(),
    [data.exercises],
  );
  const shown = searchExercises(
    data.exercises.filter(
      (e) =>
        (archived ? e.archived : !e.archived) &&
        (!favorite || e.favorite) &&
        (!custom || e.custom) &&
        (!muscle ||
          e.primary.includes(muscle) ||
          e.secondary.includes(muscle)) &&
        (!category || e.category === category) &&
        (!pattern || e.pattern === pattern) &&
        (!difficulty || e.difficulty === difficulty) &&
        (!equipment || e.equipment.includes(equipment)) &&
        (!available || missing(e).length === 0) &&
        (!bodyweight || e.load === "none") &&
        (!hideAvoided || !data.profile.avoid.includes(e.id)),
    ),
    query,
  );
  const toggleFavorite = async (e: Exercise) => {
    await updateData((d) => {
      const ex = d.exercises.find((x) => x.id === e.id);
      if (ex) ex.favorite = !ex.favorite;
    });
    if (detail?.id === e.id) setDetail({ ...e, favorite: !e.favorite });
  };
  const choose = (e: Exercise) => {
    if (onPick) onPick(e);
    else setAdd(e);
  };
  const reset = () => {
    setMuscle("");
    setCategory("");
    setDifficulty("");
    setEquipment("");
    setPattern("");
    setAvailable(false);
    setBodyweight(false);
    setHideAvoided(false);
    setArchived(false);
    setFavorite(false);
    setCustom(false);
    setQuery("");
  };
  return (
    <div className="page library-page">
      <header className="page-header">
        <div>
          {onBack && (
            <button className="btn ghost" onClick={onBack}>
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <div className="eyebrow">YOUR MOVEMENT INDEX</div>
          <h1>
            Exercise library<span className="accent">.</span>
          </h1>
          <p className="muted">Find your movement. Make it your own.</p>
        </div>
        <button
          className="btn secondary"
          onClick={() => setEditing(newExercise())}
          aria-label="Create custom exercise"
        >
          <Plus size={18} />
          <span> Create</span>
        </button>
      </header>
      <div className="toolbar">
        <label className="search-input">
          <Search size={18} />
          <input
            name="exercise-search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(60);
            }}
            placeholder="Search movements, muscles or equipment…"
            aria-label="Search exercises"
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={17} />
            </button>
          )}
        </label>
        <button
          className={`btn ${filters ? "primary" : "secondary"}`}
          aria-label="Exercise filters"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
      <div className="chip-row">
        <button
          className={`chip ${!favorite && !custom ? "active" : ""}`}
          onClick={() => {
            setFavorite(false);
            setCustom(false);
          }}
        >
          All movements
        </button>
        <button
          className={`chip ${favorite ? "active" : ""}`}
          onClick={() => {
            setFavorite(!favorite);
            setCustom(false);
          }}
        >
          <Heart size={13} /> Favorites
        </button>
        <button
          className={`chip ${custom ? "active" : ""}`}
          onClick={() => {
            setCustom(!custom);
            setFavorite(false);
          }}
        >
          My exercises
        </button>
        <button
          className={`chip ${available ? "active" : ""}`}
          onClick={() => setAvailable(!available)}
        >
          <Dumbbell size={13} /> My equipment
        </button>
      </div>
      {filters && (
        <div className="surface section stack">
          <div className="grid-2">
            <label className="field">
              Muscle group
              <Select
                className="input"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
              >
                <option value="">All muscles</option>
                {muscles.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              Category
              <Select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              Equipment
              <Select
                className="input"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              >
                <option value="">All equipment</option>
                {equipmentTypes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              Difficulty
              <Select
                className="input"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">All levels</option>
                {["Beginner", "Intermediate", "Advanced"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </label>
          </div>
          <button className="btn ghost" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
      {filters && (
        <div className="stack section">
          <label className="field">
            Movement pattern
            <Select
              className="input"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              <option value="">All patterns</option>
              {patterns.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </label>
          <div className="chip-row">
            <button
              className={`chip ${bodyweight ? "active" : ""}`}
              onClick={() => setBodyweight(!bodyweight)}
            >
              No external load
            </button>
            <button
              className={`chip ${hideAvoided ? "active" : ""}`}
              onClick={() => setHideAvoided(!hideAvoided)}
            >
              Hide avoided
            </button>
            <button
              className={`chip ${archived ? "active" : ""}`}
              onClick={() => setArchived(!archived)}
            >
              Archived exercises
            </button>
          </div>
          {environment?.maxDumbbellKg !== undefined && (
            <p className="fine-print">
              Current dumbbell limit:{" "}
              {fromKg(environment.maxDumbbellKg, data.profile.unit).toFixed(1)}{" "}
              {data.profile.unit} per hand. Choose session loads within this
              range.
            </p>
          )}
        </div>
      )}
      <div className="section-heading">
        <span className="eyebrow">{shown.length} MOVEMENTS</span>
        <span className="muted">{environment?.name ?? "All environments"}</span>
      </div>
      {shown.length === 0 ? (
        <div className="empty-state">
          <Search size={28} />
          <h3>No matching movements</h3>
          <p className="muted">
            Try a different search or create your own exercise.
          </p>
          <button className="btn secondary" onClick={reset}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className="exercise-list">
          {shown.slice(0, visibleCount).map((e) => (
            <div className="list-row exercise-row" key={e.id}>
              <button className="exercise-info" onClick={() => setDetail(e)}>
                <span className="exercise-glyph">
                  <Dumbbell size={20} />
                </span>
                <span>
                  <strong>{e.name}</strong>
                  <small className="muted">
                    Targets: {e.primary.join(", ")}
                  </small>
                  <small className="muted">
                    {e.equipment.length ? e.equipment.join(", ") : "Bodyweight"}
                  </small>
                  {missing(e).length > 0 && available === false && (
                    <small className="equipment-note">
                      Needs {missing(e).join(", ")}
                    </small>
                  )}
                </span>
                <ChevronRight size={17} />
              </button>
              {onPick ? (
                <button
                  className="icon-button"
                  aria-label={`Add ${e.name}`}
                  onClick={() => choose(e)}
                >
                  <Plus size={19} />
                </button>
              ) : (
                <button
                  className={`icon-button ${e.favorite ? "accent" : ""}`}
                  aria-label={`${e.favorite ? "Unfavorite" : "Favorite"} ${e.name}`}
                  onClick={() => void toggleFavorite(e)}
                >
                  <Heart
                    size={18}
                    fill={e.favorite ? "currentColor" : "none"}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {shown.length > visibleCount && (
        <button
          className="btn secondary full-width section"
          onClick={() => setVisibleCount((n) => n + 60)}
        >
          Show more movements ({shown.length - visibleCount} remaining)
        </button>
      )}
      {detail && (
        <Sheet title={detail.name} onClose={() => setDetail(null)}>
          <ExerciseDetail
            exercise={data.exercises.find((e) => e.id === detail.id) ?? detail}
            onFavorite={() =>
              void toggleFavorite(
                data.exercises.find((e) => e.id === detail.id) ?? detail,
              )
            }
            onPick={() => choose(detail)}
            onEdit={() => {
              setEditing(detail);
              setDetail(null);
            }}
            onAlternative={(e) => setDetail(e)}
          />
        </Sheet>
      )}
      {editing && (
        <Sheet
          title={editing.name ? "Edit exercise" : "Create an exercise"}
          onClose={() => setEditing(null)}
        >
          <ExerciseEditor exercise={editing} onClose={() => setEditing(null)} />
        </Sheet>
      )}
      {add && (
        <Sheet title={`Add ${add.name}`} onClose={() => setAdd(null)}>
          <p className="muted">
            Choose a workout template. Your saved exercise history stays
            separate.
          </p>
          <div className="stack">
            {data.templates
              .filter((t) => !t.archived)
              .map((t) => (
                <button
                  key={t.id}
                  className="list-row btn ghost"
                  onClick={async () => {
                    await updateData((d) => {
                      d.templates
                        .find((x) => x.id === t.id)
                        ?.exercises.push(prescription(add));
                    });
                    setAdd(null);
                    toast(`Added to ${t.name}`);
                  }}
                >
                  <span>{t.name}</span>
                  <Plus size={18} />
                </button>
              ))}
          </div>
          {data.templates.filter((t) => !t.archived).length === 0 && (
            <p className="muted">
              Create a workout in Plan, then add exercises here.
            </p>
          )}
        </Sheet>
      )}
    </div>
  );
}

function ExerciseDetail({
  exercise: e,
  onFavorite,
  onPick,
  onEdit,
  onAlternative,
}: {
  exercise: Exercise;
  onFavorite: () => void;
  onPick: () => void;
  onEdit: () => void;
  onAlternative: (exercise: Exercise) => void;
}) {
  const { data } = useApp();
  const [tab, setTab] = useState("Guide");
  const environment = data.equipment.find(
    (p) => p.id === data.activeEquipmentId,
  );
  const sessions = data.sessions
    .filter(
      (s) => s.completedAt && s.exercises.some((x) => x.exerciseId === e.id),
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const records = personalRecords(sessions).filter(
    (p) => p.exerciseId === e.id,
  );
  const alternatives = environment
    ? substitutions(e, data.exercises, environment)
    : [];
  const usage = data.templates.filter(
    (t) => !t.archived && t.exercises.some((x) => x.exerciseId === e.id),
  );
  return (
    <div className="stack">
      <div className="exercise-detail-hero">
        <div className="eyebrow">
          {e.category.toUpperCase()} / {e.difficulty.toUpperCase()}
        </div>
        <h2>{e.name}</h2>
        <p className="muted">{e.description}</p>
        <p className="muscle-label">Primary muscles</p>
        <div className="chip-row">
          {e.primary.map((m) => (
            <span className="chip active" key={m}>
              {m}
            </span>
          ))}
        </div>
        {e.secondary.length > 0 && (
          <>
            <p className="muscle-label">Secondary muscles</p>
            <div className="target-muscles">
              {e.secondary.map((m) => (
                <span key={m} className="muscle-tag secondary">
                  {m}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="row">
          <button className="btn primary" onClick={onPick}>
            <Plus size={17} /> Add to workout
          </button>
          <button
            className="btn secondary"
            aria-label={e.favorite ? "Remove favorite" : "Save favorite"}
            onClick={onFavorite}
          >
            <Heart size={17} fill={e.favorite ? "currentColor" : "none"} />
          </button>
          {e.custom && (
            <button className="btn ghost" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>
      {e.media &&
        (e.media.startsWith("data:video") ? (
          <video
            src={e.media}
            controls
            playsInline
            style={{ width: "100%", borderRadius: 12 }}
          />
        ) : (
          <img
            src={e.media}
            alt={`Personal demonstration of ${e.name}`}
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 12,
            }}
          />
        ))}
      <div className="chip-row">
        {["Guide", "History", "Alternatives"].map((t) => (
          <button
            className={`chip ${tab === t ? "active" : ""}`}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Guide" && (
        <>
          <div className="section">
            <h3>How to perform</h3>
            <ol className="instruction-list">
              {e.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            {e.instructions.length === 0 && (
              <p className="muted">
                Add your setup and execution cues by editing this custom
                movement.
              </p>
            )}
          </div>
          {e.mistakes.length > 0 && (
            <div className="section">
              <h3>Technique cues</h3>
              <ul className="instruction-list">
                {e.mistakes.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
          {e.safety && <p className="muted">{e.safety}</p>}
          <div className="surface stack">
            <div className="row">
              <span className="muted">Movement pattern</span>
              <span>{e.pattern || "Custom"}</span>
            </div>
            <div className="row">
              <span className="muted">Secondary muscles</span>
              <span>{e.secondary.join(", ") || "—"}</span>
            </div>
            <div className="row">
              <span className="muted">Load convention</span>
              <span>
                {
                  (
                    {
                      total: "Total external load",
                      "per-hand": "Per dumbbell",
                      machine: "Machine stack",
                      added: "Added bodyweight load",
                      assistance: "Assistance weight",
                      none: "No external load",
                    } as const
                  )[e.load]
                }
              </span>
            </div>
          </div>
          <label className="field">
            Personal notes
            <textarea
              className="input"
              rows={3}
              defaultValue={e.notes ?? ""}
              key={e.id}
              onBlur={async (ev) => {
                const notes = ev.target.value;
                await updateData((d) => {
                  const ex = d.exercises.find((x) => x.id === e.id);
                  if (ex) ex.notes = notes;
                });
              }}
              placeholder="Your setup, preferred grips, or reminders"
            />
          </label>
          {usage.length > 0 && (
            <p className="muted">
              Used in {usage.map((t) => t.name).join(", ")}.
            </p>
          )}
          <p className="fine-print">
            {e.sourceUrl ? (
              <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                {e.source} <ArrowUpRight size={12} />
              </a>
            ) : (
              e.source
            )}{" "}
            · {e.license}
          </p>
        </>
      )}
      {tab === "History" && (
        <>
          <div className="grid-2">
            {records.map((p) => (
              <div className="metric" key={p.type}>
                <span className="muted">{p.type}</span>
                <strong>
                  {p.unit === "kg"
                    ? fromKg(p.value, data.profile.unit).toFixed(1)
                    : p.value.toFixed(p.unit === "min/km" ? 2 : 0)}{" "}
                  <small>{p.unit === "kg" ? data.profile.unit : p.unit}</small>
                </strong>
              </div>
            ))}
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <h3>Your story starts here</h3>
              <p className="muted">
                Complete a workout with this exercise to track your progress.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <strong>
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                  <small className="muted">{s.name}</small>
                </div>
                <div style={{ textAlign: "right" }}>
                  {s.exercises
                    .filter((x) => x.exerciseId === e.id)
                    .flatMap((x) => x.sets)
                    .filter((x) => x.completed && !x.skipped)
                    .map((x, i) => (
                      <small key={i}>
                        {e.measurement === "duration"
                          ? `${x.durationSeconds}s`
                          : e.measurement === "cardio"
                            ? `${(x.durationSeconds / 60).toFixed(0)} min · ${x.distanceKm} km`
                            : `${fromKg(x.weightKg, data.profile.unit).toFixed(1)} ${data.profile.unit} × ${x.reps}`}
                      </small>
                    ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
      {tab === "Alternatives" && (
        <>
          <p className="muted">
            Similar muscles, prioritized by movement pattern and your{" "}
            {environment?.name ?? "current"} equipment. Start each variation at
            an appropriate load; histories do not transfer.
          </p>
          {alternatives.length === 0 ? (
            <p className="muted">
              No compatible alternatives with your current equipment. Edit your
              equipment profile or create a movement.
            </p>
          ) : (
            alternatives.map((x) => (
              <button
                className="list-row btn ghost"
                key={x.id}
                onClick={() => onAlternative(x)}
              >
                <div>
                  <strong>{x.name}</strong>
                  <small className="muted">
                    {x.pattern} · {x.difficulty}
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))
          )}
        </>
      )}
    </div>
  );
}

function ExerciseEditor({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const { data } = useApp();
  const [draft, setDraft] = useState<Exercise>({ ...exercise });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const patch = (value: Partial<Exercise>) =>
    setDraft((d) => ({ ...d, ...value }));
  const save = async () => {
    if (
      draft.defaultTargets &&
      draft.defaultTargets.repMin > draft.defaultTargets.repMax
    ) {
      setError("Default minimum reps must not exceed maximum reps.");
      return;
    }
    if (
      draft.progression &&
      draft.progression.repMin > draft.progression.repMax
    ) {
      setError("Progression minimum reps must not exceed maximum reps.");
      return;
    }
    if (!draft.name.trim() || draft.primary.length === 0) {
      setError("Add a name and at least one primary muscle or activity group.");
      return;
    }
    setSaving(true);
    try {
      await updateData((d) => {
        const index = d.exercises.findIndex((e) => e.id === draft.id);
        const value = {
          ...draft,
          name: draft.name.trim(),
          instructions: draft.instructions.map((s) => s.trim()).filter(Boolean),
          mistakes: draft.mistakes.map((s) => s.trim()).filter(Boolean),
        };
        if (index >= 0) d.exercises[index] = value;
        else d.exercises.push(value);
      });
      toast("Exercise saved");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save exercise.");
    } finally {
      setSaving(false);
    }
  };
  const defaults = draft.defaultTargets ?? {
    sets: 3,
    repMin: 8,
    repMax: 12,
    durationSeconds: draft.measurement === "cardio" ? 1200 : 30,
    distanceKm: 0,
    restSeconds: 90,
  };
  const updateTargets = (
    value: Partial<NonNullable<Exercise["defaultTargets"]>>,
  ) => patch({ defaultTargets: { ...defaults, ...value } });
  const readMedia = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose an image or video file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(
        "Choose a photo or short video under 8 MB to keep backups manageable.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch({ media: String(reader.result) });
      setError("");
    };
    reader.onerror = () => setError("Could not read this file.");
    reader.readAsDataURL(file);
  };
  return (
    <form
      className="stack"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <label className="field">
        Name
        <input
          className="input"
          required
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Your movement name"
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
          Category
          <Select
            className="input"
            value={draft.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            {[
              "Strength",
              "Calisthenics",
              "Cardio",
              "Core",
              "Mobility",
              "Conditioning",
              "Plyometrics",
              "Isometric",
              "Skill",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </label>
        <label className="field">
          Difficulty
          <Select
            className="input"
            value={draft.difficulty}
            onChange={(e) =>
              patch({ difficulty: e.target.value as Exercise["difficulty"] })
            }
          >
            {["Beginner", "Intermediate", "Advanced"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </label>
        <label className="field">
          Tracking
          <Select
            aria-label="Tracking"
            className="input"
            value={draft.measurement}
            onChange={(e) =>
              patch({ measurement: e.target.value as Measurement })
            }
          >
            <option value="weight-reps">Weight & repetitions</option>
            <option value="bodyweight">Bodyweight repetitions</option>
            <option value="assisted">Assisted repetitions</option>
            <option value="duration">Hold / duration</option>
            <option value="cardio">Cardio time & distance</option>
          </Select>
        </label>
        <label className="field">
          Load convention
          <Select
            aria-label="Load convention"
            className="input"
            value={draft.load}
            onChange={(e) =>
              patch({ load: e.target.value as Exercise["load"] })
            }
          >
            <option value="total">Total external load</option>
            <option value="per-hand">Per dumbbell</option>
            <option value="machine">Machine stack</option>
            <option value="added">Added bodyweight load</option>
            <option value="assistance">Assistance weight</option>
            <option value="none">No external load</option>
          </Select>
        </label>
      </div>
      <ListInput
        label="Primary muscles / activity (comma separated)"
        value={draft.primary}
        onChange={(primary) => patch({ primary })}
        placeholder="Chest, Triceps"
      />
      <ListInput
        label="Secondary muscles (comma separated)"
        value={draft.secondary}
        onChange={(secondary) => patch({ secondary })}
      />
      <ListInput
        label="Equipment (exact profile names, comma separated)"
        list="equipment-names"
        value={draft.equipment}
        onChange={(equipment) => patch({ equipment })}
        placeholder="Dumbbells, Flat bench"
      />
      <datalist id="equipment-names">
        {[...new Set(data.exercises.flatMap((e) => e.equipment))].map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <label className="field">
        Movement pattern
        <input
          className="input"
          value={draft.pattern}
          onChange={(e) => patch({ pattern: e.target.value })}
          placeholder="Horizontal push"
        />
      </label>
      <ListInput
        label="Common aliases (comma separated)"
        value={draft.aliases}
        onChange={(aliases) => patch({ aliases })}
      />
      <ListInput
        label="Tags (comma separated)"
        value={draft.tags ?? []}
        onChange={(tags) => patch({ tags })}
      />
      {draft.load === "per-hand" && (
        <label className="row">
          <span>
            Both hands lift simultaneously (two implements for volume)
          </span>
          <input
            type="checkbox"
            checked={draft.tags?.includes("two-implements") ?? false}
            onChange={(e) =>
              patch({
                tags: e.target.checked
                  ? [...new Set([...(draft.tags ?? []), "two-implements"])]
                  : (draft.tags ?? []).filter((t) => t !== "two-implements"),
              })
            }
          />
        </label>
      )}
      <label className="field">
        Instructions <span className="muted">one step per line</span>
        <textarea
          className="input"
          rows={4}
          value={draft.instructions.join("\n")}
          onChange={(e) => patch({ instructions: e.target.value.split("\n") })}
          placeholder="Set up your equipment.&#10;Perform the movement under control."
        />
      </label>
      <label className="field">
        Technique mistakes / cues <span className="muted">one per line</span>
        <textarea
          className="input"
          rows={3}
          value={draft.mistakes.join("\n")}
          onChange={(e) => patch({ mistakes: e.target.value.split("\n") })}
        />
      </label>
      <label className="field">
        Safety considerations
        <textarea
          className="input"
          rows={2}
          value={draft.safety}
          onChange={(e) => patch({ safety: e.target.value })}
        />
      </label>
      <label className="field">
        Personal notes
        <textarea
          className="input"
          rows={2}
          value={draft.notes ?? ""}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </label>
      <details>
        <summary>Default targets & progression</summary>
        <div className="stack section">
          <label className="row">
            <span>Save custom default targets</span>
            <input
              type="checkbox"
              checked={Boolean(draft.defaultTargets)}
              onChange={(e) =>
                patch({
                  defaultTargets: e.target.checked ? defaults : undefined,
                })
              }
            />
          </label>
          {draft.defaultTargets && (
            <div className="grid-2">
              <NumberField
                label="Working sets"
                min={1}
                max={30}
                value={defaults.sets}
                onChange={(sets) => updateTargets({ sets })}
              />
              <NumberField
                label="Rest (seconds)"
                max={1800}
                value={defaults.restSeconds}
                onChange={(restSeconds) => updateTargets({ restSeconds })}
              />
              <NumberField
                label="Minimum reps"
                min={1}
                max={500}
                value={defaults.repMin}
                onChange={(repMin) => updateTargets({ repMin })}
              />
              <NumberField
                label="Maximum reps"
                min={1}
                max={500}
                value={defaults.repMax}
                onChange={(repMax) => updateTargets({ repMax })}
              />
              <NumberField
                label="Duration (seconds)"
                min={1}
                max={86400}
                value={defaults.durationSeconds}
                onChange={(durationSeconds) =>
                  updateTargets({ durationSeconds })
                }
              />
              <NumberField
                label="Distance (km)"
                step={0.1}
                max={1000}
                value={defaults.distanceKm}
                onChange={(distanceKm) => updateTargets({ distanceKm })}
              />
            </div>
          )}
          <label className="row">
            <span>Save exercise-specific progression</span>
            <input
              type="checkbox"
              checked={Boolean(draft.progression)}
              onChange={(e) =>
                patch({
                  progression: e.target.checked
                    ? structuredClone(data.profile.progression)
                    : undefined,
                })
              }
            />
          </label>
          {draft.progression && (
            <RuleEditor
              rule={draft.progression}
              onChange={(progression) => patch({ progression })}
              unit={data.profile.unit}
            />
          )}
        </div>
      </details>
      <label className="field">
        Personal photo or short video
        <input
          className="input"
          type="file"
          accept="image/*,video/*"
          onChange={(e) => readMedia(e.target.files?.[0])}
        />
        <small className="muted">
          Stored privately on this device. Maximum 8 MB.
        </small>
      </label>
      {draft.media && (
        <button
          className="btn ghost"
          type="button"
          onClick={() => patch({ media: undefined })}
        >
          Remove media
        </button>
      )}
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
        <Check size={18} /> {saving ? "Saving…" : "Save exercise"}
      </button>
      {data.exercises.some((e) => e.id === exercise.id) && (
        <button
          className="btn danger"
          type="button"
          onClick={async () => {
            await updateData((d) => {
              const e = d.exercises.find((x) => x.id === exercise.id);
              if (e) e.archived = !e.archived;
            });
            toast(
              exercise.archived
                ? "Exercise restored"
                : "Exercise archived. Workout history is preserved.",
            );
            onClose();
          }}
        >
          {exercise.archived ? "Restore exercise" : "Archive exercise"}
        </button>
      )}
    </form>
  );
}
