import { HelpToggle } from "../components/Help";
import { Select, NumericInput } from "../components/inputs";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Download,
  Shield,
  SlidersHorizontal,
  Headphones,
  Mic,
  Sparkles,
  Utensils,
  CalendarDays,
  Database,
  Check,
} from "lucide-react";
import type {
  AppData,
  EquipmentProfile,
  Focus,
  Profile,
} from "../domain/types";
import { dateKey, id } from "../domain/helpers";
import { fromKg, toKg } from "../domain/engine";
import HeightInput from "../components/HeightInput";
import {
  useApp,
  updateData,
  exportBackup,
  importBackup,
  clearData,
} from "../state/store";
import { Button, Field, Sheet, SectionHeading, toast } from "../components/ui";
import { downloadFile, nutritionCSV, workoutCSV } from "../nutrition/helpers";
import { speechSupported } from "../integrations/speech";
import {
  configureSpotify,
  connectSpotify,
  disconnectSpotify,
  spotifyClientId,
  spotifyConnected,
  openSpotify,
} from "../integrations/spotify";
import { remindersICS } from "../integrations/reminders";
import { endpointAI, validateAIEndpoint } from "../integrations/ai";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const focuses: Focus[] = [
  "Hypertrophy",
  "Strength",
  "Endurance",
  "Cardio",
  "Calisthenics",
  "General fitness",
  "Hybrid",
];
type Pane =
  | "profile"
  | "appearance"
  | "equipment"
  | "ai"
  | "voice"
  | "spotify"
  | "reminders"
  | "data"
  | "privacy"
  | null;
function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The change could not be saved. Try again.";
}
async function save(change: (draft: AppData) => void): Promise<boolean> {
  try {
    await updateData(change);
    return true;
  } catch (error) {
    toast(errorMessage(error));
    return false;
  }
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="list-row">
      <div>
        <strong>{label}</strong>
        {description && <p className="muted">{description}</p>}
      </div>
      <input
        type="checkbox"
        className="toggle"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export default function Settings({
  onBack,
  onNutrition,
}: {
  onBack: () => void;
  onNutrition: () => void;
}) {
  const { data } = useApp();
  const [pane, setPane] = useState<Pane>(null);
  const [equipment, setEquipment] = useState<EquipmentProfile | null>(null);
  const feature = (
    key:
      | "nutrition"
      | "ai"
      | "voice"
      | "spotify"
      | "gamification"
      | "celebrations",
    value: boolean,
  ) => {
    void save((d) => {
      d.profile[key] = value;
    });
    if (key === "spotify" && !value) disconnectSpotify();
  };
  const rows = [
    {
      pane: "appearance" as Pane,
      icon: SlidersHorizontal,
      title: "Appearance",
      sub: "Accent color and spacing",
    },
    {
      pane: "profile" as Pane,
      icon: SlidersHorizontal,
      title: "Training profile",
      sub: `${data.profile.focus} · ${data.profile.unit.toUpperCase()} · ${data.profile.days.length} days / week`,
    },
    {
      pane: "equipment" as Pane,
      icon: Plus,
      title: "Equipment environments",
      sub:
        data.equipment.find((e) => e.id === data.activeEquipmentId)?.name ??
        "Choose your environment",
    },
    {
      pane: "reminders" as Pane,
      icon: CalendarDays,
      title: "Reminders & calendar",
      sub: "A rhythm that fits your week",
    },
    {
      pane: "data" as Pane,
      icon: Database,
      title: "Backup & data",
      sub: "Your training. Your ownership.",
    },
    {
      pane: "privacy" as Pane,
      icon: Shield,
      title: "Privacy & capabilities",
      sub: "Local first, transparent by design",
    },
  ];
  return (
    <div className="page optional-page settings-page">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your preferences</p>
          <h1>Settings</h1>
          <p className="muted">Make Setwise fit the way you train.</p>
        </div>
        <HelpToggle />
      </header>
      <section
        className="settings-profile-summary"
        aria-label="Your training preferences"
      >
        <span className="settings-avatar">
          {data.profile.name.trim().slice(0, 1).toUpperCase() || "S"}
        </span>
        <div>
          <strong>{data.profile.name || "Your training profile"}</strong>
          <p className="muted">
            {data.profile.focus} · {data.profile.experience}
          </p>
        </div>
        <button className="text-btn" onClick={() => setPane("profile")}>
          Edit profile <ChevronRight size={14} />
        </button>
      </section>
      <section className="section settings-navigation">
        {rows.map(({ pane: next, icon: Icon, title, sub }) => (
          <button
            className="list-row"
            key={title}
            onClick={() => setPane(next)}
          >
            <Icon size={20} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <strong>{title}</strong>
              <p className="muted">{sub}</p>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>
      <section className="section settings-tools">
        <SectionHeading title="Optional tools" />
        <p className="muted settings-tools-intro">
          Your workout tracker is complete on its own. Add the tools that make
          your day easier.
        </p>
        <Toggle
          label="Nutrition"
          description="A separate space for food, recipes, water and personal targets."
          checked={data.profile.nutrition}
          onChange={(v) => feature("nutrition", v)}
        />
        {data.profile.nutrition && (
          <Button variant="secondary" onClick={onNutrition}>
            <Utensils size={16} /> Open nutrition
          </Button>
        )}
        <Toggle
          label="AI assistant"
          description="Off unless you enable it. Requires your secure endpoint."
          checked={data.profile.ai}
          onChange={(v) => feature("ai", v)}
        />
        {data.profile.ai && (
          <Button variant="ghost" onClick={() => setPane("ai")}>
            <Sparkles size={16} /> AI permissions & coach
          </Button>
        )}
        <Toggle
          label="Voice commands"
          description="Push to talk, with text and manual fallback."
          checked={data.profile.voice}
          onChange={(v) => feature("voice", v)}
        />
        {data.profile.voice && (
          <Button variant="ghost" onClick={() => setPane("voice")}>
            <Mic size={16} /> Voice information
          </Button>
        )}
        <Toggle
          label="Spotify"
          description="Optional playback controls during training."
          checked={data.profile.spotify}
          onChange={(v) => feature("spotify", v)}
        />
        {data.profile.spotify && (
          <Button variant="ghost" onClick={() => setPane("spotify")}>
            <Headphones size={16} /> Connect Spotify
          </Button>
        )}
      </section>
      <section className="section">
        <SectionHeading title="Motivation" />
        <Toggle
          label="Consistency & milestones"
          description="Rest days are part of your plan."
          checked={data.profile.gamification}
          onChange={(v) => feature("gamification", v)}
        />
        <Toggle
          label="Small celebrations"
          description="Subtle feedback when you reach a milestone."
          checked={data.profile.celebrations}
          onChange={(v) => feature("celebrations", v)}
        />
      </section>
      <section className="section">
        <p className="eyebrow">Setwise 1.3</p>
        <p className="muted">
          Dark mode. No account required. Motion follows your device’s
          reduced-motion setting. Optional tools never remove saved records when
          disabled. Nutrition is also accessible directly from the app
          navigation.
        </p>
      </section>
      {pane === "profile" && (
        <ProfileEditor profile={data.profile} onClose={() => setPane(null)} />
      )}
      {pane === "appearance" && (
        <Sheet title="Appearance" onClose={() => setPane(null)}>
          <div className="stack">
            <Field label="Accent color">
              <Select
                value={data.profile.accent ?? "sage"}
                onChange={(event) =>
                  void save((draft) => {
                    draft.profile.accent = event.target
                      .value as Profile["accent"];
                  })
                }
              >
                <option value="sage">Sage</option>
                <option value="steel">Sky blue</option>
                <option value="violet">Soft violet</option>
                <option value="neutral">Neutral</option>
              </Select>
            </Field>
            <Field label="Spacing">
              <Select
                value={data.profile.density ?? "comfortable"}
                onChange={(event) =>
                  void save((draft) => {
                    draft.profile.density = event.target
                      .value as Profile["density"];
                  })
                }
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </Select>
            </Field>
            <p className="muted">
              Dark surfaces and readable controls stay consistent. Your choices
              save on this device.
            </p>
          </div>
        </Sheet>
      )}
      {pane === "equipment" && (
        <Sheet title="Equipment environments" onClose={() => setPane(null)}>
          <p className="muted">
            Switch environments without rewriting your workout history. Review
            substitutions in Train.
          </p>
          <div className="stack">
            {data.equipment.map((e) => (
              <div className="list-row" key={e.id}>
                <button
                  className="btn ghost"
                  style={{ flex: 1, textAlign: "left" }}
                  onClick={() =>
                    void save((d) => {
                      d.activeEquipmentId = e.id;
                    })
                  }
                >
                  {data.activeEquipmentId === e.id && <Check size={16} />}{" "}
                  {e.name}
                </button>
                <Button
                  variant="secondary"
                  onClick={() => setEquipment({ ...e, items: [...e.items] })}
                >
                  Edit
                </Button>
              </div>
            ))}
            <Button
              onClick={() =>
                setEquipment({
                  id: id(),
                  name: "",
                  items: [],
                  canIncline: true,
                  notes: "",
                })
              }
            >
              <Plus size={18} /> Add environment
            </Button>
          </div>
        </Sheet>
      )}
      {equipment && (
        <EquipmentEditor
          value={equipment}
          data={data}
          onClose={() => setEquipment(null)}
        />
      )}
      {pane === "voice" && (
        <Sheet title="Voice controls" onClose={() => setPane(null)}>
          <p>
            {speechSupported()
              ? "This browser exposes speech recognition. Availability also depends on permissions and its speech service."
              : "Speech recognition is unavailable here. Text commands and manual logging remain available."}
          </p>
          <p className="muted">
            Tap the microphone during a workout for one utterance. Your
            browser’s speech service may send audio to its provider; offline
            recognition is not guaranteed. Setwise does not record or store
            microphone audio.
          </p>
          <h3>Try these commands</h3>
          <ul>
            <li>Log ten reps at 135 pounds.</li>
            <li>I did eight reps.</li>
            <li>Add another set.</li>
            <li>Change the weight to 140.</li>
            <li>Start a two minute rest.</li>
            <li>What’s next?</li>
            <li>Finish workout.</li>
          </ul>
          <p className="muted">
            Review the command before applying it. Ending or skipping requires
            confirmation. Revoke microphone access in Safari or browser site
            settings.
          </p>
        </Sheet>
      )}
      {pane === "spotify" && <SpotifySettings onClose={() => setPane(null)} />}
      {pane === "reminders" && (
        <ReminderSettings data={data} onClose={() => setPane(null)} />
      )}
      {pane === "ai" && (
        <AISettings data={data} onClose={() => setPane(null)} />
      )}
      {pane === "data" && (
        <DataSettings data={data} onClose={() => setPane(null)} />
      )}
      {pane === "privacy" && (
        <Sheet title="Privacy & capabilities" onClose={() => setPane(null)}>
          <p>
            Your profile, workouts, recipes and food diary stay on this device.
            There is no account, analytics tracker, or automatic cloud sync.
          </p>
          <p className="muted">
            Food search sends your query or barcode to Open Food Facts. Camera
            frames stay in the browser. Browser speech recognition may use its
            provider’s servers. AI sends your question plus only the context
            categories you explicitly permit. Spotify communicates directly with
            Spotify; credentials never appear in backups.
          </p>
          <h3>Your controls</h3>
          <p className="muted">
            Disable any tool here. Revoke camera or microphone permission in
            browser settings. Export a backup or delete your local records under
            Backup & data. Export files contain sensitive fitness information;
            store them privately.
          </p>
          <h3>Future native features</h3>
          <p className="muted">
            HealthKit, Apple Watch, Siri/App Intents, Live Activities,
            Foundation Models and guaranteed native scheduled notifications are
            not available in this PWA. Native iOS packaging needs macOS/Xcode
            and separate implementation and testing.
          </p>
          <p className="muted">
            Nutrition is an editable estimate. Training recommendations are
            configurable heuristics, not medical assessments.
          </p>
          <a href="https://openfoodfacts.org" target="_blank" rel="noreferrer">
            Food data: Open Food Facts · ODbL / DbCL
          </a>
        </Sheet>
      )}
    </div>
  );
}
function ProfileEditor({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [p, setP] = useState<Profile>(() => structuredClone(profile)),
    [avoidText, setAvoidText] = useState(profile.avoid.join(", ")),
    [secondaryText, setSecondaryText] = useState(
      profile.secondaryGoals.join(", "),
    );
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (p.progression.repMin > p.progression.repMax) {
      toast("Minimum reps must not exceed maximum reps.");
      return;
    }
    try {
      await updateData((d) => {
        const avoid = avoidText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .map(
            (value) =>
              d.exercises.find(
                (ex) =>
                  ex.id === value ||
                  ex.name.toLowerCase() === value.toLowerCase(),
              )?.id ?? value,
          );
        d.profile = {
          ...p,
          avoid: [...new Set(avoid)],
          secondaryGoals: secondaryText
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        };
      });
      toast("Training preferences saved");
      onClose();
    } catch (error) {
      toast(errorMessage(error));
    }
  };
  return (
    <Sheet title="Training profile" onClose={onClose}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <Field label="Display name">
          <input
            value={p.name}
            onChange={(e) => field("name", e.target.value)}
            maxLength={100}
          />
        </Field>
        <div className="grid-2">
          <Field label="Measurement units">
            <Select
              value={p.unit}
              onChange={(e) => field("unit", e.target.value as Profile["unit"])}
            >
              <option value="kg">Kilograms</option>
              <option value="lb">Pounds</option>
            </Select>
          </Field>
          <Field label="Experience">
            <Select
              value={p.experience}
              onChange={(e) =>
                field("experience", e.target.value as Profile["experience"])
              }
            >
              {["Beginner", "Intermediate", "Advanced"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Primary training focus">
          <Select
            value={p.focus}
            onChange={(e) => field("focus", e.target.value as Focus)}
          >
            {focuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Secondary goals" hint="Separate your goals with commas.">
          <input
            value={secondaryText}
            onChange={(e) => setSecondaryText(e.target.value)}
          />
        </Field>
        <Field label={`Bodyweight (${p.unit}), optional`}>
          <NumericInput
            min={p.unit === "kg" ? 20 : 44}
            max={p.unit === "kg" ? 500 : 1100}
            step="0.1"
            value={
              p.bodyweightKg === undefined
                ? ""
                : Math.round(fromKg(p.bodyweightKg, p.unit) * 10) / 10
            }
            onChange={(e) =>
              field(
                "bodyweightKg",
                e.target.value
                  ? toKg(Number(e.target.value), p.unit)
                  : undefined,
              )
            }
          />
        </Field>
        <HeightInput
          unit={p.unit}
          valueCm={p.heightCm}
          onChange={(value) => field("heightCm", value)}
        />
        <div>
          <span className="eyebrow">PREFERRED DAYS</span>
          <div className="toolbar" style={{ flexWrap: "wrap" }}>
            {days.map((name, index) => (
              <button
                type="button"
                key={name}
                className={`chip ${p.days.includes(index) ? "active" : ""}`}
                aria-pressed={p.days.includes(index)}
                onClick={() =>
                  field(
                    "days",
                    p.days.includes(index)
                      ? p.days.filter((d) => d !== index)
                      : [...p.days, index].sort(),
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <Field label="Preferred split">
          <input
            value={p.split}
            onChange={(e) => field("split", e.target.value)}
          />
        </Field>
        <div className="grid-2">
          <Field label="Session minutes">
            <NumericInput
              required
              min="5"
              max="300"
              value={p.duration}
              onChange={(e) => field("duration", Number(e.target.value))}
            />
          </Field>
          <Field label="Default rest (seconds)">
            <NumericInput
              required
              min="0"
              max="3600"
              value={p.restSeconds}
              onChange={(e) => field("restSeconds", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Effort tracking">
          <Select
            value={p.effort}
            onChange={(e) =>
              field("effort", e.target.value as Profile["effort"])
            }
          >
            <option value="rir">Reps in reserve</option>
            <option value="rpe">RPE</option>
            <option value="both">RIR & RPE</option>
            <option value="none">None</option>
          </Select>
        </Field>
        <Field
          label="Training limitations"
          hint="Personal constraints for your reference; these are not a medical diagnosis."
        >
          <textarea
            value={p.limitations}
            onChange={(e) => field("limitations", e.target.value)}
          />
        </Field>
        <Field
          label="Exercises to avoid"
          hint="Names or exercise IDs, separated by commas."
        >
          <input
            value={avoidText}
            onChange={(e) => setAvoidText(e.target.value)}
          />
        </Field>
        <SectionHeading title="Progression defaults" />
        <p className="muted">
          These apply to recommendations. Individual exercise rules can override
          them.
        </p>
        <Field label="Strategy">
          <Select
            value={p.progression.strategy}
            onChange={(e) =>
              field("progression", {
                ...p.progression,
                strategy: e.target.value as Profile["progression"]["strategy"],
              })
            }
          >
            {[
              ["double", "Double progression"],
              ["linear", "Load increments"],
              ["reps", "Repetition progression"],
              ["volume", "Set / volume progression"],
              ["rir", "RIR guided"],
              ["rpe", "RPE guided"],
              ["percentage", "Percentage increase"],
              ["manual", "Manual"],
              ["review", "Periodic review"],
              ["skill", "Skill milestone"],
              ["duration", "Duration"],
              ["distance", "Distance"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid-2">
          {(
            [
              ["repMin", "Minimum reps", 1, 100],
              ["repMax", "Maximum reps", 1, 100],
              ["successfulSets", "Successful sets", 1, 20],
              ["sessions", "Successes required", 1, 20],
              ["incrementKg", "Load increment (kg)", 0.1, 50],
              ["percentage", "Increase (%)", 0.1, 25],
              ["minRir", "Minimum RIR", 0, 10],
              ["maxRpe", "Maximum RPE", 1, 10],
              ["minDays", "Days between increases", 0, 365],
              ["plateauSessions", "Plateau sessions", 1, 50],
              ["reviewDays", "Review interval (days)", 1, 365],
            ] as const
          ).map(([key, label, min, max]) => (
            <Field label={label} key={key}>
              <NumericInput
                required
                min={min}
                max={max}
                step={key === "incrementKg" || key === "percentage" ? 0.1 : 1}
                value={p.progression[key]}
                onChange={(e) =>
                  field("progression", {
                    ...p.progression,
                    [key]: Number(e.target.value),
                  })
                }
              />
            </Field>
          ))}
        </div>
        <Field
          label="Indirect muscle-set contribution"
          hint="A configurable estimate, from 0 to 1; direct sets always count as 1."
        >
          <NumericInput
            required
            min="0"
            max="1"
            step="0.1"
            value={p.indirectFactor}
            onChange={(e) => field("indirectFactor", Number(e.target.value))}
          />
        </Field>
        <Button type="submit">Save preferences</Button>
      </form>
    </Sheet>
  );
}
function EquipmentEditor({
  value,
  data,
  onClose,
}: {
  value: EquipmentProfile;
  data: AppData;
  onClose: () => void;
}) {
  const [e, setE] = useState(value),
    [custom, setCustom] = useState("");
  const items = [
    ...new Set([...data.exercises.flatMap((x) => x.equipment), ...e.items]),
  ].sort();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateData((d) => {
        const i = d.equipment.findIndex((x) => x.id === e.id);
        if (i >= 0) d.equipment[i] = e;
        else d.equipment.push(e);
      });
      toast("Equipment environment saved");
      onClose();
    } catch (error) {
      toast(errorMessage(error));
    }
  };
  return (
    <Sheet title="Edit environment" onClose={onClose}>
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <Field label="Environment name">
          <input
            required
            maxLength={100}
            value={e.name}
            onChange={(event) => setE({ ...e, name: event.target.value })}
          />
        </Field>
        <p className="muted">
          Select the equipment you can use. An empty inventory supports
          equipment-free exercises.
        </p>
        <div className="grid-2">
          {items.map((item) => (
            <label className="row" key={item}>
              <input
                type="checkbox"
                checked={e.items.includes(item)}
                onChange={(event) =>
                  setE({
                    ...e,
                    items: event.target.checked
                      ? [...e.items, item]
                      : e.items.filter((i) => i !== item),
                  })
                }
              />
              <span>{item.replace(/-/g, " ")}</span>
            </label>
          ))}
        </div>
        <Field label="Custom equipment">
          <div className="row">
            <input
              aria-label="Custom equipment"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="e.g. landmine attachment"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!custom.trim()}
              onClick={() => {
                setE({
                  ...e,
                  items: [
                    ...new Set([...e.items, custom.trim().toLowerCase()]),
                  ],
                });
                setCustom("");
              }}
            >
              Add
            </Button>
          </div>
        </Field>
        <Field
          label={`Maximum dumbbell weight (${data.profile.unit} each), optional`}
        >
          <NumericInput
            min="0.1"
            max={data.profile.unit === "kg" ? 200 : 440}
            step="0.1"
            value={
              e.maxDumbbellKg === undefined
                ? ""
                : Math.round(fromKg(e.maxDumbbellKg, data.profile.unit) * 10) /
                  10
            }
            onChange={(event) =>
              setE({
                ...e,
                maxDumbbellKg: event.target.value
                  ? toKg(Number(event.target.value), data.profile.unit)
                  : undefined,
              })
            }
          />
        </Field>
        <Toggle
          label="Bench can incline"
          checked={e.canIncline}
          onChange={(v) => setE({ ...e, canIncline: v })}
        />
        <Field label="Equipment notes and constraints">
          <textarea
            value={e.notes}
            onChange={(event) => setE({ ...e, notes: event.target.value })}
          />
        </Field>
        <Button type="submit">Save environment</Button>
        {data.equipment.some((x) => x.id === e.id) &&
          data.equipment.length > 1 && (
            <Button
              variant="danger"
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Remove this equipment environment? Completed workouts retain their recorded equipment reference.",
                  )
                )
                  void save((d) => {
                    d.equipment = d.equipment.filter((x) => x.id !== e.id);
                    if (d.activeEquipmentId === e.id)
                      d.activeEquipmentId = d.equipment[0].id;
                  }).then((ok) => {
                    if (ok) onClose();
                  });
              }}
            >
              Remove environment
            </Button>
          )}
      </form>
    </Sheet>
  );
}
function SpotifySettings({ onClose }: { onClose: () => void }) {
  const [client, setClient] = useState(spotifyClientId()),
    [connected, setConnected] = useState(spotifyConnected());
  return (
    <Sheet title="Spotify" onClose={onClose}>
      <p>
        Playback control requires Spotify Premium, a Spotify developer app, an
        allowed test user and an active playback device.
      </p>
      <p className="muted">
        Create your own app in the Spotify developer dashboard. Register this
        exact redirect URI:
      </p>
      <code style={{ overflowWrap: "anywhere" }}>
        {location.origin + location.pathname}
      </code>
      <Field
        label="Spotify Client ID"
        hint="A public application identifier. Never enter a client secret."
      >
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="stack">
        <Button
          disabled={!client.trim()}
          onClick={() => {
            configureSpotify(client);
            void connectSpotify().catch((error) => toast(errorMessage(error)));
          }}
        >
          Authorize with Spotify
        </Button>
        <Button variant="secondary" onClick={openSpotify}>
          Open Spotify
        </Button>
        {connected && (
          <Button
            variant="ghost"
            onClick={() => {
              disconnectSpotify();
              setConnected(false);
              toast("Spotify disconnected locally");
            }}
          >
            Disconnect
          </Button>
        )}
      </div>
      <p className="muted">
        {connected ? "Connected for this browser session." : "Not connected."}{" "}
        Access tokens stay in memory and are excluded from backups. Reconnect
        after reloading. Spotify developer access policies and rate limits may
        prevent authorization; direct access to Spotify always remains
        available.
      </p>
      <a
        href="https://developer.spotify.com/dashboard"
        target="_blank"
        rel="noreferrer"
      >
        Spotify developer dashboard
      </a>
    </Sheet>
  );
}
function ReminderSettings({
  data,
  onClose,
}: {
  data: AppData;
  onClose: () => void;
}) {
  const [r, setR] = useState(structuredClone(data.reminders));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateData((d) => {
        d.reminders = r;
      });
      toast("Reminder preferences saved");
      onClose();
    } catch (error) {
      toast(errorMessage(error));
    }
  };
  return (
    <Sheet title="Reminders & calendar" onClose={onClose}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <Toggle
          label="In-app training reminders"
          description="Shown while Setwise is open, at your preferred time."
          checked={r.enabled}
          onChange={(enabled) => setR({ ...r, enabled })}
        />
        <Field label="Reminder time">
          <input
            required
            type="time"
            value={r.time}
            onChange={(e) => setR({ ...r, time: e.target.value })}
          />
        </Field>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          {days.map((day, index) => (
            <button
              type="button"
              key={day}
              className={`chip ${r.days.includes(index) ? "active" : ""}`}
              aria-pressed={r.days.includes(index)}
              onClick={() =>
                setR({
                  ...r,
                  days: r.days.includes(index)
                    ? r.days.filter((x) => x !== index)
                    : [...r.days, index],
                })
              }
            >
              {day}
            </button>
          ))}
        </div>
        <div className="grid-2">
          <Field label="Quiet hours start">
            <input
              required
              type="time"
              value={r.quietStart}
              onChange={(e) => setR({ ...r, quietStart: e.target.value })}
            />
          </Field>
          <Field label="Quiet hours end">
            <input
              required
              type="time"
              value={r.quietEnd}
              onChange={(e) => setR({ ...r, quietEnd: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Tone">
          <Select
            value={r.tone}
            onChange={(e) => setR({ ...r, tone: e.target.value })}
          >
            {["calm", "friendly", "motivational"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <div className="stack">
          {[
            "scheduled",
            "missed",
            "weekly",
            "return",
            "milestone",
            "program",
            "review",
            "rest",
          ].map((category) => (
            <label className="row" key={category}>
              <input
                type="checkbox"
                checked={r.categories.includes(category)}
                onChange={(e) =>
                  setR({
                    ...r,
                    categories: e.target.checked
                      ? [...r.categories, category]
                      : r.categories.filter((c) => c !== category),
                  })
                }
              />
              {category} reminders
            </label>
          ))}
        </div>
        <Button type="submit">Save preferences</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            downloadFile(
              remindersICS({ ...data, reminders: r }),
              `setwise-plan-${dateKey()}.ics`,
              "text/calendar",
            )
          }
        >
          Export planned workouts to calendar
        </Button>
        <p className="muted">
          Calendar export includes planned sessions for the next 90 days and a
          15-minute alert. Import it into Apple Calendar for alerts managed by
          your calendar. Setwise does not guarantee background scheduled
          notifications: this PWA has no push-delivery server. Quiet hours apply
          to in-app reminders; your calendar controls its own alerts.
        </p>
      </form>
    </Sheet>
  );
}
function AISettings({ data, onClose }: { data: AppData; onClose: () => void }) {
  const [settings, setSettings] = useState({ ...data.aiSettings }),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false);
  const savePermissions = async () => {
    try {
      const next = {
        ...settings,
        endpoint: validateAIEndpoint(settings.endpoint),
      };
      if (
        await save((d) => {
          d.aiSettings = next;
        })
      )
        toast("AI permissions saved");
    } catch (error) {
      toast(errorMessage(error));
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setAnswer("");
    try {
      const next = {
        ...settings,
        endpoint: validateAIEndpoint(settings.endpoint),
      };
      await updateData((d) => {
        d.aiSettings = next;
      });
      setAnswer(await endpointAI.ask(question, { ...data, aiSettings: next }));
    } catch (error) {
      setAnswer(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="AI permissions & coach" onClose={onClose}>
      <p className="muted">
        AI is optional and unconfigured by default. Your endpoint must keep
        provider keys on its server, enforce quotas, and prevent any paid
        fallback. Setwise never modifies training from an AI answer.
      </p>
      <Field
        label="Secure AI endpoint"
        hint="HTTPS URL or /api/coach. No API keys, credentials, or query parameters."
      >
        <input
          value={settings.endpoint}
          onChange={(e) =>
            setSettings({ ...settings, endpoint: e.target.value })
          }
          placeholder="/api/coach"
          spellCheck={false}
        />
      </Field>
      <Toggle
        label="Share training summary"
        description="Last 10 completed sessions: exercises, sets and dates. No notes."
        checked={settings.historyConsent}
        onChange={(v) => setSettings({ ...settings, historyConsent: v })}
      />
      <Toggle
        label="Share training preferences"
        description="Focus, experience, days, duration and units. No name or body measurements."
        checked={settings.profileConsent}
        onChange={(v) => setSettings({ ...settings, profileConsent: v })}
      />
      <Toggle
        label="Share nutrition summary"
        description="Targets and last 50 diary entries. No personal notes."
        checked={settings.nutritionConsent}
        onChange={(v) => setSettings({ ...settings, nutritionConsent: v })}
      />
      <Button variant="secondary" onClick={() => void savePermissions()}>
        Save permissions
      </Button>
      <form className="stack section" onSubmit={(e) => void submit(e)}>
        <Field
          label="Ask your coach"
          hint="Your question is sent when you tap Ask. Avoid including sensitive details you do not wish to share."
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={4000}
            placeholder="Explain my next progression step…"
          />
        </Field>
        <Button type="submit" disabled={busy || !question.trim()}>
          {busy ? "Waiting for your endpoint…" : "Ask coach"}
        </Button>
        {answer && (
          <div
            className="surface"
            role="status"
            style={{ whiteSpace: "pre-wrap", padding: 16 }}
          >
            {answer}
          </div>
        )}
      </form>
      <p className="muted">
        Provider answers can be wrong. This tool is for general training
        information, not diagnosis. The app does not install, configure or
        purchase an AI service.
      </p>
    </Sheet>
  );
}
function DataSettings({
  data,
  onClose,
}: {
  data: AppData;
  onClose: () => void;
}) {
  const [backup, setBackup] = useState(""),
    [action, setAction] = useState<"restore" | "delete" | "nutrition" | null>(
      null,
    ),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      if (action === "restore") {
        await importBackup(backup);
        toast("Backup restored");
        setBackup("");
      } else if (action === "delete") {
        disconnectSpotify();
        localStorage.removeItem("forma.spotify.client");
        await clearData();
        toast("Local app records cleared");
      } else if (action === "nutrition") {
        await updateData((d) => {
          d.diary = [];
          d.foods = [];
          d.recipes = [];
          d.water = {};
        });
        toast("Nutrition records cleared");
      }
      setAction(null);
      setConfirmation("");
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Backup & data" onClose={onClose}>
      <p className="muted">
        Browser storage can be cleared by your device. Export regular backups
        and keep them somewhere private. JSON includes all training and
        nutrition records; it excludes Spotify credentials.
      </p>
      <p className="fine-print">
        Large photos and videos can fill your device’s available app storage.
        Prefer small files or media links, and export a backup before importing
        a large collection.
      </p>
      <div className="stack">
        <Button
          onClick={() => {
            downloadFile(exportBackup(), `setwise-backup-${dateKey()}.json`);
            void save((d) => {
              d.lastBackup = new Date().toISOString();
            });
            toast("Backup downloaded");
          }}
        >
          <Download size={16} /> Download full JSON backup
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            downloadFile(
              workoutCSV(data),
              `setwise-workouts-${dateKey()}.csv`,
              "text/csv",
            )
          }
        >
          Export workouts CSV
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            downloadFile(
              nutritionCSV(data),
              `setwise-nutrition-${dateKey()}.csv`,
              "text/csv",
            )
          }
        >
          Export nutrition CSV
        </Button>
        {data.lastBackup && (
          <p className="muted">
            Last backup: {new Date(data.lastBackup).toLocaleString()}
          </p>
        )}
        <Field label="Choose a JSON backup">
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) {
                  toast("Backup exceeds the 20 MB import limit.");
                  return;
                }
                void file
                  .text()
                  .then(setBackup)
                  .catch(() => toast("Could not read this backup."));
              }
            }}
          />
        </Field>
        <Field label="Or paste backup JSON">
          <textarea
            value={backup}
            onChange={(e) => setBackup(e.target.value)}
            rows={4}
            spellCheck={false}
          />
        </Field>
        <Button
          variant="secondary"
          disabled={!backup.trim()}
          onClick={() => {
            setAction("restore");
            setConfirmation("");
          }}
        >
          Review restore
        </Button>
        <div className="divider" />
        <Button
          variant="danger"
          onClick={() => {
            setAction("nutrition");
            setConfirmation("");
          }}
        >
          Clear nutrition records
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setAction("delete");
            setConfirmation("");
          }}
        >
          Delete all local app data
        </Button>
      </div>
      {action && (
        <section
          className="surface section"
          style={{ padding: 16 }}
          role="alert"
        >
          <h3>
            {action === "restore"
              ? "Replace local data from backup?"
              : action === "nutrition"
                ? "Delete nutrition records?"
                : "Delete all local records?"}
          </h3>
          <p className="muted">
            {action === "restore"
              ? "A valid backup replaces your current local records. Invalid backups are rejected without changing your records. Export your current data first."
              : "This cannot be undone without a backup. Export your records before continuing."}
          </p>
          <Field
            label={`Type ${action === "restore" ? "RESTORE" : "DELETE"} to confirm`}
          >
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <div className="row">
            <Button
              variant="danger"
              disabled={
                busy ||
                confirmation !== (action === "restore" ? "RESTORE" : "DELETE")
              }
              onClick={() => void run()}
            >
              {busy ? "Working…" : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
    </Sheet>
  );
}
