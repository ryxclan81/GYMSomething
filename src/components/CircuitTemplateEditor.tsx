import { Repeat2, Dumbbell } from "lucide-react";
import type { Template } from "../domain/types";
import { Field } from "./ui";
import { NumericInput } from "./inputs";
import "../circuit.css";

export function CircuitTemplateEditor({
  value,
  onChange,
}: {
  value?: Template["circuit"];
  onChange: (value: Template["circuit"]) => void;
}) {
  return (
    <section className="circuit-template-editor" aria-label="Workout format">
      <h3>Workout format</h3>
      <div
        className="circuit-format-options"
        role="group"
        aria-label="Choose workout format"
      >
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange(undefined)}
        >
          <Dumbbell size={18} aria-hidden="true" />
          <span>Sets and reps</span>
        </button>
        <button
          type="button"
          aria-pressed={!!value}
          onClick={() => onChange(value ?? { durationSeconds: 1200 })}
        >
          <Repeat2 size={18} aria-hidden="true" />
          <span>Timed circuit</span>
        </button>
      </div>
      {value && (
        <>
          <Field label="Circuit time limit (minutes)">
            <NumericInput
              min={1 / 60}
              max={1440}
              step="any"
              value={value.durationSeconds / 60}
              onValueChange={(minutes) =>
                onChange({ durationSeconds: (minutes ?? 0) * 60 })
              }
            />
          </Field>
          <p className="small muted">
            Repeat your movements in order until the time limit. Set a target
            for each movement per round—for example, 5 pull-ups, 10 push-ups and
            15 squats for 20 minutes.
          </p>
          <p className="small muted">
            You record completed rounds or individual movements. The timer never
            adds repetitions automatically.
          </p>
        </>
      )}
    </section>
  );
}
