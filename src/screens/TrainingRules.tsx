import { NumericInput, Select } from "../components/inputs";
import { Field } from "../components/ui";
import type { ProgressionRule } from "../domain/types";
import { fromKg, toKg } from "../domain/engine";

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <NumericInput
        className="input"
        min={min}
        max={max}
        step={step}
        required
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function RuleEditor({
  rule,
  onChange,
  unit,
}: {
  rule: ProgressionRule;
  onChange: (rule: ProgressionRule) => void;
  unit: "kg" | "lb";
}) {
  const patch = (value: Partial<ProgressionRule>) =>
    onChange({ ...rule, ...value });
  return (
    <div className="stack">
      <label className="field">
        Strategy
        <Select
          className="input"
          value={rule.strategy}
          onChange={(e) =>
            patch({
              strategy: e.target.value as ProgressionRule["strategy"],
              percentage:
                e.target.value === "percentage" && rule.percentage < 30
                  ? 75
                  : e.target.value !== "percentage" && rule.percentage > 25
                    ? 5
                    : rule.percentage,
            })
          }
        >
          {Object.entries({
            double: "Double progression",
            linear: "Linear load progression",
            reps: "Repetition progression",
            volume: "Set-volume review",
            rir: "RIR autoregulation",
            rpe: "RPE autoregulation",
            percentage: "Percentage of estimated 1RM",
            manual: "Manual progression",
            review: "Time-based review",
            skill: "Calisthenics skill review",
            duration: "Duration progression",
            distance: "Distance progression",
          }).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid-2">
        <NumberField
          label="Minimum reps"
          min={
            ["duration", "distance", "skill", "review"].includes(rule.strategy)
              ? 0
              : 1
          }
          max={500}
          value={rule.repMin}
          onChange={(repMin) => patch({ repMin })}
        />
        <NumberField
          label="Maximum reps"
          min={
            ["duration", "distance", "skill", "review"].includes(rule.strategy)
              ? 0
              : 1
          }
          max={500}
          value={rule.repMax}
          onChange={(repMax) => patch({ repMax })}
        />
        <NumberField
          label="Successful sets required"
          min={1}
          max={30}
          value={rule.successfulSets}
          onChange={(successfulSets) => patch({ successfulSets })}
        />
        <NumberField
          label="Successful sessions required"
          min={1}
          max={20}
          value={rule.sessions}
          onChange={(sessions) => patch({ sessions })}
        />
        <NumberField
          label={`Load increment (${unit})`}
          min={0}
          max={100}
          step={0.01}
          value={Number(fromKg(rule.incrementKg, unit).toFixed(2))}
          onChange={(weight) => patch({ incrementKg: toKg(weight, unit) })}
        />
        <NumberField
          label={
            rule.strategy === "percentage"
              ? "Percentage of estimated 1RM (%)"
              : "Percentage increment (%)"
          }
          min={rule.strategy === "percentage" ? 30 : 0}
          max={
            rule.strategy === "percentage"
              ? 95
              : ["duration", "distance"].includes(rule.strategy)
                ? 10
                : 25
          }
          step={0.5}
          value={rule.percentage}
          onChange={(percentage) => patch({ percentage })}
        />
        <NumberField
          label="Minimum required RIR"
          min={0}
          max={10}
          value={rule.minRir}
          onChange={(minRir) => patch({ minRir })}
        />
        <NumberField
          label="Maximum allowed RPE"
          min={1}
          max={10}
          step={0.5}
          value={rule.maxRpe}
          onChange={(maxRpe) => patch({ maxRpe })}
        />
        <NumberField
          label="Minimum days between increases"
          min={0}
          max={365}
          value={rule.minDays}
          onChange={(minDays) => patch({ minDays })}
        />
        <NumberField
          label="Plateau review (sessions)"
          min={2}
          max={52}
          value={rule.plateauSessions}
          onChange={(plateauSessions) => patch({ plateauSessions })}
        />
        <NumberField
          label="Review after days"
          min={1}
          max={365}
          value={rule.reviewDays}
          onChange={(reviewDays) => patch({ reviewDays })}
        />
      </div>
      <p className="fine-print">
        These configurable heuristics review performance and effort. Configured
        effort gates require logged effort; missing effort blocks gated
        increases. Suggestions explain their trigger and wait for approval;
        elapsed time never forces a load increase.
      </p>
    </div>
  );
}
