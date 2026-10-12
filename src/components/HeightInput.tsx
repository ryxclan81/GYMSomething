import { useEffect, useRef, useState } from "react";
import type { Unit } from "../domain/types";
import { Field } from "./ui";
import { NumericInput } from "./inputs";

export interface HeightParts {
  feet?: number;
  inches?: number;
}

export function heightParts(cm?: number): HeightParts {
  if (cm === undefined || !Number.isFinite(cm) || cm <= 0) return {};
  const total = cm / 2.54;
  let feet = Math.floor(total / 12);
  let inches = Math.round((total - feet * 12) * 100) / 100;
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function heightFromParts({
  feet,
  inches,
}: HeightParts): number | undefined {
  if (
    (feet !== undefined && (!Number.isInteger(feet) || feet < 0)) ||
    (inches !== undefined &&
      (!Number.isFinite(inches) || inches < 0 || inches >= 12))
  )
    return undefined;
  const total = (feet ?? 0) * 12 + (inches ?? 0);
  return Number.isFinite(total) && total > 0
    ? Math.round(total * 2.54 * 10000) / 10000
    : undefined;
}

/** Unit changes only alter the display. The saved measurement stays in centimeters. */
export default function HeightInput({
  valueCm,
  unit,
  onChange,
}: {
  valueCm?: number;
  unit: Unit;
  onChange: (cm: number | undefined) => void;
}) {
  const [parts, setParts] = useState<HeightParts>(() => heightParts(valueCm));
  const lastEmitted = useRef(valueCm);
  useEffect(() => {
    if (lastEmitted.current !== valueCm) {
      setParts(heightParts(valueCm));
      lastEmitted.current = valueCm;
    }
  }, [valueCm]);
  const edit = (key: keyof HeightParts, value: number | undefined) => {
    const next = { ...parts, [key]: value };
    setParts(next);
    const cm = heightFromParts(next);
    lastEmitted.current = cm;
    onChange(cm);
  };
  if (unit === "kg")
    return (
      <Field label="Height (cm), optional">
        <NumericInput
          min={50}
          max={280}
          step={0.01}
          value={
            valueCm === undefined ? undefined : Math.round(valueCm * 100) / 100
          }
          onValueChange={(value) =>
            onChange(value !== undefined && value > 0 ? value : undefined)
          }
        />
      </Field>
    );
  return (
    <fieldset className="height-input">
      <legend>Height (optional)</legend>
      <div className="grid-2">
        <Field label="Feet">
          <NumericInput
            min={0}
            max={9}
            step={1}
            value={parts.feet}
            onValueChange={(value) => edit("feet", value)}
          />
        </Field>
        <Field label="Inches">
          <NumericInput
            min={0}
            max={11.99}
            step={0.01}
            value={parts.inches}
            onValueChange={(value) => edit("inches", value)}
          />
        </Field>
      </div>
      <p className="fine-print">
        Leave both empty to skip. Inches can be zero.
      </p>
    </fieldset>
  );
}
