import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  Dumbbell,
  ShieldCheck,
  Utensils,
  Mic,
  Sparkles,
  Headphones,
  CalendarDays,
} from "lucide-react";

import type { EquipmentProfile, Focus, Profile } from "../domain/types";

import { dateKey, id } from "../domain/helpers";

import { fromKg, toKg } from "../domain/engine";

import { equipmentOptions } from "../data/exercises";

import { useApp, updateData } from "../state/store";

import { Button, Field, Sheet, toast } from "./ui";

import { Select, NumericInput } from "./inputs";

import HeightInput from "./HeightInput";

import { applyProgram, alignTrainingDays } from "../domain/planning";

const focuses: Focus[] = [
  "Hypertrophy",

  "Strength",

  "Endurance",

  "Cardio",

  "Calisthenics",

  "General fitness",

  "Hybrid",
];

const weekdays = [
  "Sunday",

  "Monday",

  "Tuesday",

  "Wednesday",

  "Thursday",

  "Friday",

  "Saturday",
];

const titles = [
  "A place to begin.",

  "Find your rhythm.",

  "Train where you are.",

  "Add what helps you.",

  "Your setup, ready.",
];

const descriptions = [
  "Start with the basics. Every preference is optional and editable later.",

  "Choose a realistic week. Rest days belong in your plan.",

  "Your environment shapes the movements available to you.",

  "Keep training simple, or add tools for the way you live.",

  "Review your choices. You can adjust everything in Settings.",
];

function ToolChoice({
  title,

  description,

  checked,

  onChange,

  icon: Icon,
}: {
  title: string;

  description: string;

  checked: boolean;

  onChange: (checked: boolean) => void;

  icon: typeof Utensils;
}) {
  return (
    <label className={`setup-tool ${checked ? "selected" : ""}`}>
      <span className="setup-tool-icon">
        <Icon size={19} />
      </span>

      <span>
        <strong>{title}</strong>

        <small>{description}</small>
      </span>

      <input
        className="toggle"

        type="checkbox"

        checked={checked}

        onChange={(e) => onChange(e.target.checked)}

        aria-label={`Enable ${title.toLowerCase()}`}
      />
    </label>
  );
}

export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const { data } = useApp();

  const [step, setStep] = useState(0),
    [p, setP] = useState<Profile>(() => ({
      ...structuredClone(data.profile),

      focus: "Hypertrophy",

      days: [1, 2, 4, 5],
    }));

  const [environments, setEnvironments] = useState<EquipmentProfile[]>(() =>
      structuredClone(data.equipment),
    ),
    [equipmentId, setEquipmentId] = useState(data.activeEquipmentId),
    [secondary, setSecondary] = useState(
      data.profile.secondaryGoals.join(", "),
    ),
    [avoid, setAvoid] = useState(data.profile.avoid.join(", ")),
    [split, setSplit] = useState("Automatic"),
    [makePlan, setMakePlan] = useState(true),
    [preset, setPreset] = useState("automatic"),
    [reminders, setReminders] = useState(data.reminders.enabled),
    [busy, setBusy] = useState(false);

  const form = useRef<HTMLFormElement>(null);

  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [step]);

  const patch = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setP((previous) => ({ ...previous, [key]: value }));

  const environment =
    environments.find((e) => e.id === equipmentId) ?? environments[0];

  const equipmentItems = [
    ...new Set([...equipmentOptions, ...environment.items]),
  ].sort();

  const editEquipment = (patch: Partial<EquipmentProfile>) =>
    setEnvironments((previous) =>
      previous.map((e) => (e.id === equipmentId ? { ...e, ...patch } : e)),
    );

  const finish = async () => {
    if (p.progression.repMin > p.progression.repMax) {
      toast("Minimum reps must not exceed maximum reps.");

      setStep(1);

      return;
    }

    if (environments.some((e) => !e.name.trim())) {
      toast("Give your equipment environment a name.");

      setStep(2);

      return;
    }

    setBusy(true);

    try {
      await updateData((d) => {
        const avoided = avoid

          .split(",")

          .map((value) => value.trim())

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

          name: p.name.trim(),

          secondaryGoals: secondary

            .split(",")

            .map((x) => x.trim())

            .filter(Boolean),

          avoid: [...new Set(avoided)],

          onboardingComplete: true,
        };

        d.equipment = environments.map((e) => ({ ...e, name: e.name.trim() }));

        d.activeEquipmentId = equipmentId;

        d.reminders.enabled = reminders;

        d.reminders.days = [...p.days];

        const programKey =
          equipmentId === "eq-home"
            ? "prg-home"
            : split === "Upper / lower"
              ? "prg-upperlower"
              : split === "Push / pull / legs"
                ? "prg-ppl"
                : split === "Full body"
                  ? "prg-full"
                  : split === "Hybrid"
                    ? "prg-hybrid"
                    : p.focus === "Strength"
                      ? "prg-strength"
                      : p.focus === "Calisthenics"
                        ? "prg-bodyweight"
                        : p.focus === "Hybrid" || p.focus === "Cardio"
                          ? "prg-hybrid"
                          : p.focus === "Hypertrophy"
                            ? p.days.length >= 5
                              ? "prg-five"
                              : p.days.length >= 4
                                ? "prg-upperlower"
                                : "prg-ppl"
                            : "prg-full";

        const program = d.programs.find(
          (program) =>
            program.id === (preset === "automatic" ? programKey : preset),
        );

        d.profile.split =
          split === "Automatic" ? (program?.name ?? "Custom") : split;

        if (makePlan && !d.schedule.length && program && p.days.length) {
          applyProgram(d, {
            ...program,
            id: id(),
            name: `${program.name} · starter`,

            startDate: dateKey(),
            weeks: 2,
            deloadWeek: undefined,
            phases: undefined,

            days:
              preset === "automatic"
                ? p.days
                : alignTrainingDays(program.days, dateKey()),
          });
        }
      });

      onDone?.();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Preferences could not be saved. Check browser storage permissions.",
      );
    } finally {
      setBusy(false);
    }
  };

  const next = (event: FormEvent) => {
    event.preventDefault();

    if (step < 4) setStep(step + 1);
    else void finish();
  };

  return (
    <Sheet title="Welcome to Setwise" onClose={() => {}}>
      <form ref={form} className="setup-flow" onSubmit={next}>
        <div ref={body} className="setup-body">
          <div
            className="setup-progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={step + 1}

            aria-label={`Setup step ${step + 1} of 5`}
          >
            {titles.map((_, i) => (
              <span key={i} className={i <= step ? "complete" : ""} />
            ))}
          </div>

          <div className="setup-intro">
            <p className="eyebrow">
              YOUR TRAINING, ON YOUR TERMS · {step + 1}/5
            </p>

            <h1>{titles[step]}</h1>

            <p className="muted">{descriptions[step]}</p>
          </div>

          {step === 0 && (
            <div className="stack">
              <Field label="What should we call you? (optional)">
                <input
                  maxLength={60}

                  value={p.name}

                  onChange={(e) => patch("name", e.target.value)}

                  placeholder="Your first name"

                  autoComplete="given-name"
                />
              </Field>

              <Field label="Primary focus">
                <Select
                  value={p.focus}

                  onChange={(e) => patch("focus", e.target.value as Focus)}
                >
                  {focuses.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Measurement units">
                <div className="segmented">
                  <button
                    type="button"

                    className={p.unit === "lb" ? "selected" : ""}

                    aria-pressed={p.unit === "lb"}

                    onClick={() => patch("unit", "lb")}
                  >
                    Pounds · lb
                  </button>

                  <button
                    type="button"

                    className={p.unit === "kg" ? "selected" : ""}

                    aria-pressed={p.unit === "kg"}

                    onClick={() => patch("unit", "kg")}
                  >
                    Kilograms · kg
                  </button>
                </div>
              </Field>

              <Field label={`Bodyweight (${p.unit}), optional`}>
                <NumericInput
                  min={p.unit === "kg" ? 20 : 44}

                  max={p.unit === "kg" ? 500 : 1100}

                  step={0.1}

                  value={
                    p.bodyweightKg === undefined
                      ? ""
                      : Math.round(fromKg(p.bodyweightKg, p.unit) * 10) / 10
                  }

                  onChange={(e) =>
                    patch(
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

                onChange={(value) => patch("heightCm", value)}
              />

              <p className="fine-print setup-measurements-hint">
                Skip these if you prefer. No calorie target is calculated from
                body measurements.
              </p>

              <section
                className="setup-preferences"

                aria-label="More about you"
              >
                <div className="setup-section-heading">
                  <h2>More about you</h2>

                  <span>Optional</span>
                </div>

                <div className="stack">
                  <Field label="Experience">
                    <Select
                      value={p.experience}

                      onChange={(e) =>
                        patch(
                          "experience",

                          e.target.value as Profile["experience"],
                        )
                      }
                    >
                      {["Beginner", "Intermediate", "Advanced"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Secondary goals"

                    hint="Combine goals, separated by commas."
                  >
                    <input
                      value={secondary}

                      onChange={(e) => setSecondary(e.target.value)}

                      placeholder="e.g. Cardio, Calisthenics"
                    />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <div
                className="setup-week"

                role="group"

                aria-label="Preferred training days"
              >
                {weekdays.map((day, i) => (
                  <button
                    type="button"

                    aria-label={day}

                    aria-pressed={p.days.includes(i)}

                    className={p.days.includes(i) ? "selected" : ""}

                    key={day}

                    onClick={() =>
                      patch(
                        "days",

                        p.days.includes(i)
                          ? p.days.filter((d) => d !== i)
                          : [...p.days, i].sort(),
                      )
                    }
                  >
                    <small>{day.slice(0, 3)}</small>

                    <span>
                      {p.days.includes(i) ? (
                        <Check size={17} />
                      ) : (
                        <span className="setup-day-dot" />
                      )}
                    </span>
                  </button>
                ))}
              </div>

              <p className="muted small">
                {p.days.length
                  ? `${p.days.length} training days, ${7 - p.days.length} recovery days.`
                  : "No fixed days. Build your schedule whenever you are ready."}
              </p>

              <Field label="Preferred session length (minutes)">
                <NumericInput
                  required

                  min={5}

                  max={300}

                  value={p.duration}

                  onChange={(e) => patch("duration", Number(e.target.value))}
                />
              </Field>

              <section
                className="setup-preferences"

                aria-label="Training preferences"
              >
                <div className="setup-section-heading">
                  <h2>Training preferences</h2>

                  <span>Optional</span>
                </div>

                <div className="stack">
                  <Field label="Preferred split">
                    <Select
                      value={split}

                      onChange={(e) => setSplit(e.target.value)}
                    >
                      {[
                        "Automatic",

                        "Full body",

                        "Upper / lower",

                        "Push / pull / legs",

                        "Hybrid",

                        "Custom",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </Select>
                  </Field>

                  <div className="grid-2">
                    <Field label="Default rest (seconds)">
                      <NumericInput
                        required

                        min={0}

                        max={3600}

                        value={p.restSeconds}

                        onChange={(e) =>
                          patch("restSeconds", Number(e.target.value))
                        }
                      />
                    </Field>

                    <Field label="Effort tracking">
                      <Select
                        value={p.effort}

                        onChange={(e) =>
                          patch("effort", e.target.value as Profile["effort"])
                        }
                      >
                        <option value="rir">Reps in reserve</option>

                        <option value="rpe">RPE</option>

                        <option value="both">RIR & RPE</option>

                        <option value="none">None</option>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Progression approach">
                    <Select
                      value={p.progression.strategy}

                      onChange={(e) =>
                        patch("progression", {
                          ...p.progression,

                          strategy: e.target
                            .value as Profile["progression"]["strategy"],
                        })
                      }
                    >
                      <option value="double">Double progression</option>

                      <option value="linear">Load increments</option>

                      <option value="reps">Repetitions</option>

                      <option value="rir">RIR guided</option>

                      <option value="manual">Manual progression</option>

                      <option value="review">Periodic review</option>

                      <option value="duration">Duration</option>

                      <option value="distance">Distance</option>
                    </Select>
                  </Field>

                  <div className="grid-2">
                    <Field label="Default minimum reps">
                      <NumericInput
                        required

                        min={1}

                        max={100}

                        value={p.progression.repMin}

                        onChange={(e) =>
                          patch("progression", {
                            ...p.progression,

                            repMin: Number(e.target.value),
                          })
                        }
                      />
                    </Field>

                    <Field label="Default maximum reps">
                      <NumericInput
                        required

                        min={1}

                        max={100}

                        value={p.progression.repMax}

                        onChange={(e) =>
                          patch("progression", {
                            ...p.progression,

                            repMax: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Training limitations (optional)">
                    <textarea
                      value={p.limitations}

                      onChange={(e) => patch("limitations", e.target.value)}

                      placeholder="Any movements or constraints you want to keep in mind"
                    />
                  </Field>

                  <Field
                    label="Exercises to avoid (optional)"

                    hint="Names or IDs, separated by commas."
                  >
                    <input
                      value={avoid}

                      onChange={(e) => setAvoid(e.target.value)}

                      placeholder="e.g. Barbell Full Squat"
                    />
                  </Field>

                  <p className="fine-print">
                    These are your preferences, not a medical assessment.
                    Progression rules can be tuned fully in Settings.
                  </p>
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <div className="setup-environments">
                {environments.map((e) => (
                  <button
                    className={`setup-environment ${e.id === equipmentId ? "selected" : ""}`}

                    type="button"

                    key={e.id}

                    onClick={() => setEquipmentId(e.id)}
                  >
                    <Dumbbell size={20} />

                    <span>
                      <strong>{e.name}</strong>

                      <small>
                        {e.items.slice(0, 3).join(" · ") || "No equipment"}
                      </small>
                    </span>

                    {e.id === equipmentId && <Check size={17} />}
                  </button>
                ))}
              </div>

              <section
                className="setup-preferences"

                aria-label="Customize your inventory"
              >
                <div className="setup-section-heading">
                  <h2>Customize your inventory</h2>

                  <span>Optional</span>
                </div>

                <div className="stack">
                  <Field label="Environment name">
                    <input
                      required

                      value={environment.name}

                      onChange={(e) => editEquipment({ name: e.target.value })}

                      maxLength={100}
                    />
                  </Field>

                  <div className="setup-inventory">
                    {equipmentItems.map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"

                          checked={environment.items.includes(item)}

                          onChange={(e) =>
                            editEquipment({
                              items: e.target.checked
                                ? [...environment.items, item]
                                : environment.items.filter(
                                    (value) => value !== item,
                                  ),
                            })
                          }
                        />

                        <span>{item}</span>
                      </label>
                    ))}
                  </div>

                  <Field
                    label={`Maximum dumbbell weight (${p.unit} each), optional`}
                  >
                    <NumericInput
                      min={0.1}

                      max={p.unit === "kg" ? 200 : 440}

                      step={0.1}

                      value={
                        environment.maxDumbbellKg === undefined
                          ? ""
                          : Math.round(
                              fromKg(environment.maxDumbbellKg, p.unit) * 10,
                            ) / 10
                      }

                      onChange={(e) =>
                        editEquipment({
                          maxDumbbellKg: e.target.value
                            ? toKg(Number(e.target.value), p.unit)
                            : undefined,
                        })
                      }
                    />
                  </Field>

                  <label className="setup-check">
                    <input
                      type="checkbox"

                      checked={environment.canIncline}

                      onChange={(e) =>
                        editEquipment({ canIncline: e.target.checked })
                      }
                    />

                    <span>Bench can incline</span>
                  </label>

                  <Field label="Equipment notes (optional)">
                    <textarea
                      value={environment.notes}

                      onChange={(e) => editEquipment({ notes: e.target.value })}
                    />
                  </Field>

                  <Button
                    variant="secondary"

                    type="button"

                    onClick={() => {
                      const next: EquipmentProfile = {
                        id: id(),

                        name: "My setup",

                        items: [],

                        canIncline: false,

                        notes: "",
                      };

                      setEnvironments([...environments, next]);

                      setEquipmentId(next.id);
                    }}
                  >
                    Add a custom environment
                  </Button>
                </div>
              </section>

              <p className="fine-print">
                Equipment examples are editable. Unavailable movements will be
                flagged with compatible alternatives before a workout.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <div className="setup-nutrition-intro">
                <p className="eyebrow">BEYOND SETS & REPS</p>

                <h2>A place for nutrition.</h2>

                <p className="muted">
                  Log food, scan products, save recipes and track water. It has
                  its own space, away from your workouts.
                </p>
              </div>

              <ToolChoice
                title="Nutrition"

                description="Enable the food diary, recipes and your own editable targets."

                checked={p.nutrition}

                onChange={(value) => patch("nutrition", value)}

                icon={Utensils}
              />

              <ToolChoice
                title="Voice commands"

                description="Push to talk when your browser supports it. Manual logging always works."

                checked={p.voice}

                onChange={(value) => patch("voice", value)}

                icon={Mic}
              />

              <ToolChoice
                title="AI assistant"

                description="Optional coach. Requires a secure endpoint and separate data permissions."

                checked={p.ai}

                onChange={(value) => patch("ai", value)}

                icon={Sparkles}
              />

              <ToolChoice
                title="Spotify"

                description="Workout controls require Premium and your developer app. Open Spotify is a fallback."

                checked={p.spotify}

                onChange={(value) => patch("spotify", value)}

                icon={Headphones}
              />

              <ToolChoice
                title="Reminders"

                description="Gentle in-app nudges. Calendar exports can provide scheduled alerts."

                checked={reminders}

                onChange={setReminders}

                icon={CalendarDays}
              />

              <label className="setup-check">
                <input
                  type="checkbox"

                  checked={p.gamification}

                  onChange={(e) => patch("gamification", e.target.checked)}
                />

                <span>Show consistency and milestones</span>
              </label>

              <label className="setup-check">
                <input
                  type="checkbox"

                  checked={p.celebrations}

                  onChange={(e) => patch("celebrations", e.target.checked)}
                />

                <span>Small milestone celebrations</span>
              </label>

              <p className="fine-print">
                Optional tools do not request camera, microphone or third-party
                access until you use them. Nutrition, AI, voice and Spotify
                start off.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <dl className="setup-review">
                <div>
                  <dt>Training focus</dt>

                  <dd>
                    {p.focus}

                    <small>
                      {p.experience} · {p.unit.toUpperCase()}
                    </small>
                  </dd>
                </div>

                <div>
                  <dt>Your week</dt>

                  <dd>
                    {p.days.length
                      ? `${p.days.length} days · ${p.duration} minutes`
                      : "A flexible schedule"}

                    <small>
                      {p.days.map((d) => weekdays[d].slice(0, 3)).join(" · ") ||
                        "Choose days later"}
                    </small>
                  </dd>
                </div>

                <div>
                  <dt>Environment</dt>

                  <dd>
                    {environment.name}

                    <small>
                      {environment.items.length} equipment types ·{" "}
                      {environment.canIncline
                        ? "Incline bench enabled"
                        : "No incline bench assumed"}
                    </small>
                  </dd>
                </div>

                <div>
                  <dt>Optional tools</dt>

                  <dd>
                    {[
                      p.nutrition ? "Nutrition" : "",

                      p.voice ? "Voice" : "",

                      p.ai ? "AI" : "",

                      p.spotify ? "Spotify" : "",

                      reminders ? "Reminders" : "",
                    ]

                      .filter(Boolean)

                      .join(" · ") || "Training essentials only"}

                    <small>All choices stay editable</small>
                  </dd>
                </div>
              </dl>

              <Field label="Starter program">
                <Select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value)}
                >
                  <option value="automatic">Choose from my preferences</option>

                  {data.programs
                    .filter((program) => !program.archived)
                    .map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                </Select>
              </Field>

              {preset !== "automatic" && (
                <p className="fine-print">
                  {data.programs
                    .find((program) => program.id === preset)
                    ?.templateIds.map(
                      (key) =>
                        data.templates.find((template) => template.id === key)
                          ?.name,
                    )
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · The first workout is scheduled today, with the preset’s
                  weekly spacing.
                </p>
              )}

              <label className="setup-plan-choice">
                <input
                  type="checkbox"

                  checked={makePlan}

                  onChange={(e) => setMakePlan(e.target.checked)}
                />

                <span>
                  <strong>Create an editable starter plan</strong>

                  <small>
                    Two weeks on your selected days, or the chosen preset’s
                    weekdays. Nothing is added to completed workout history.
                  </small>
                </span>
              </label>

              <p className="setup-privacy">
                <ShieldCheck size={17} /> No account. Your records stay on this
                device. Export a backup regularly.
              </p>
            </div>
          )}
        </div>

        <footer className="setup-footer">
          <div className="setup-actions">
            <div>
              {step > 0 ? (
                <Button
                  type="button"

                  variant="ghost"

                  disabled={busy}

                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft size={16} /> Back
                </Button>
              ) : (
                <Button
                  type="button"

                  variant="ghost"

                  onClick={() => setStep(4)}
                >
                  Use defaults
                </Button>
              )}
            </div>

            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : step === 4 ? "Let’s get started" : "Continue"}

              <ArrowRight size={17} />
            </Button>
          </div>

          {step < 4 && (
            <button
              className="setup-skip"

              type="button"

              onClick={() => setStep(step + 1)}
            >
              Skip for now — use current defaults
            </button>
          )}
        </footer>
      </form>
    </Sheet>
  );
}
