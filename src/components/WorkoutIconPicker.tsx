import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Sheet } from "./ui";
import { WorkoutGlyph } from "./WorkoutIcon";
import {
  workoutIconLabel,
  workoutIcons,
  type WorkoutIconId,
} from "../domain/workoutIcons";

export default function WorkoutIconPicker({
  value,
  onChange,
}: {
  value: WorkoutIconId;
  onChange: (icon: WorkoutIconId) => void;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  return (
    <fieldset className="workout-icon-picker">
      <legend>Workout icon</legend>
      <button
        type="button"
        className="workout-icon-trigger"
        aria-label="Choose workout icon"
        aria-describedby={descriptionId}
        onClick={() => setOpen(true)}
      >
        <WorkoutGlyph icon={value} size={32} />
        <span>{workoutIconLabel(value)}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      <p id={descriptionId} className="sr-only" role="status">
        Selected: {workoutIconLabel(value)}
      </p>
      {open && (
        <Sheet title="Workout icon library" onClose={() => setOpen(false)}>
          <p className="muted">
            Choose a symbol you can recognize at a glance.
          </p>
          <div
            className="workout-icon-options"
            role="group"
            aria-label="Workout icon library"
          >
            {workoutIcons.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`workout-icon-option ${value === item.id ? "selected" : ""}`}
                aria-label={`Use ${item.label} icon`}
                aria-pressed={value === item.id}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <WorkoutGlyph icon={item.id} size={28} />
                <span>{item.label}</span>
                {value === item.id && (
                  <Check
                    size={13}
                    className="workout-icon-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </fieldset>
  );
}
