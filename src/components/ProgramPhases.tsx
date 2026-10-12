import type { ProgramPhase } from "../domain/types";
import { id } from "../domain/helpers";
import { NumericInput } from "./inputs";

export default function ProgramPhases({
  phases,
  weeks,
  onChange,
}: {
  phases: ProgramPhase[];
  weeks: number;
  onChange: (phases: ProgramPhase[]) => void;
}) {
  const patch = (phaseId: string, value: Partial<ProgramPhase>) =>
    onChange(
      phases.map((phase) =>
        phase.id === phaseId ? { ...phase, ...value } : phase,
      ),
    );
  return (
    <section className="stack" aria-label="Program phases">
      <div className="row">
        <h3>Phases (optional)</h3>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            const start = Math.min(
              weeks,
              Math.max(0, ...phases.map((phase) => phase.endWeek)) + 1,
            );
            onChange([
              ...phases,
              {
                id: id(),
                name: `Phase ${phases.length + 1}`,
                startWeek: start,
                endWeek: weeks,
                setsMultiplier: 1,
                loadMultiplier: 1,
              },
            ]);
          }}
        >
          Add phase
        </button>
      </div>
      <p className="fine-print">
        Set repetition, volume and load targets for selected weeks. These create
        separate workout versions when applied. Your original workouts and
        history stay intact.
      </p>
      {phases.map((phase, index) => (
        <fieldset className="surface stack phase-editor" key={phase.id}>
          <legend>Phase {index + 1}</legend>
          <label className="field">
            Phase name
            <input
              required
              value={phase.name}
              onChange={(event) =>
                patch(phase.id, { name: event.target.value })
              }
            />
          </label>
          <div className="grid-2">
            <label className="field">
              First week
              <NumericInput
                required
                min={1}
                max={weeks}
                value={phase.startWeek}
                onChange={(event) =>
                  patch(phase.id, { startWeek: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              Last week
              <NumericInput
                required
                min={phase.startWeek}
                max={weeks}
                value={phase.endWeek}
                onChange={(event) =>
                  patch(phase.id, { endWeek: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              Base sets (%)
              <NumericInput
                required
                min={10}
                max={300}
                step="any"
                value={phase.setsMultiplier * 100}
                onChange={(event) =>
                  patch(phase.id, {
                    setsMultiplier: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
            <label className="field">
              Base load (%)
              <NumericInput
                required
                min={0}
                max={200}
                step="any"
                value={phase.loadMultiplier * 100}
                onChange={(event) =>
                  patch(phase.id, {
                    loadMultiplier: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
            <label className="field">
              Minimum reps (optional)
              <NumericInput
                min={1}
                max={1000}
                value={phase.repMin ?? ""}
                onChange={(event) =>
                  patch(phase.id, {
                    repMin: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
            </label>
            <label className="field">
              Maximum reps (optional)
              <NumericInput
                min={1}
                max={1000}
                value={phase.repMax ?? ""}
                onChange={(event) =>
                  patch(phase.id, {
                    repMax: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              onChange(phases.filter((value) => value.id !== phase.id))
            }
          >
            Remove phase
          </button>
        </fieldset>
      ))}
    </section>
  );
}
