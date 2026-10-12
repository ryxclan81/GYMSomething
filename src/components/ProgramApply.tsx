import { useState } from "react";
import type { Program } from "../domain/types";
import { dateKey, formatDate } from "../domain/helpers";
import {
  alignTrainingDays,
  applyProgram,
  previewProgram,
  programImpact,
  programValidation,
  type ApplyMode,
} from "../domain/planning";
import { useApp, updateData } from "../state/store";
import { Sheet, toast } from "./ui";
import { Select } from "./inputs";

export default function ProgramApply({
  program,
  onClose,
  onApplied,
}: {
  program: Program;
  onClose: () => void;
  onApplied: (startDate: string) => void;
}) {
  const { data } = useApp();
  const [startDate, setStartDate] = useState(dateKey());
  const [align, setAlign] = useState(true);
  const [mode, setMode] = useState<ApplyMode>("keep");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = {
    ...program,
    startDate,
    days: align ? alignTrainingDays(program.days, startDate) : program.days,
  };
  const validation = programValidation(draft);
  const preview = validation ? null : previewProgram(draft, data.templates);
  const impact = preview ? programImpact(data, preview) : null;
  const submit = async () => {
    setBusy(true);
    try {
      let added = 0;
      await updateData((data) => {
        added = applyProgram(data, draft, { mode }).added;
      });
      toast(`${added} workouts added to your calendar`);
      onApplied(startDate);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save this program.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={`Use ${program.name}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="muted">
          Review the dates, then add this program to your daily workouts.
        </p>
        <label className="field">
          Start date
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="row">
          <span>First workout on the start date</span>
          <input
            type="checkbox"
            checked={align}
            onChange={(event) => setAlign(event.target.checked)}
          />
        </label>
        <p className="fine-print">
          {align
            ? "The weekly spacing shifts with your start date."
            : "The program keeps its original weekdays."}{" "}
          Explicit rest days, skipped workouts and recorded sessions are
          preserved.
        </p>
        <label className="field">
          Existing planned workouts
          <Select
            value={mode}
            onChange={(event) => setMode(event.target.value as ApplyMode)}
          >
            <option value="keep">Keep my existing plan</option>
            <option value="replace">
              Replace unstarted plans in this date range
            </option>
          </Select>
        </label>
        {preview && (
          <>
            <p>
              {preview.entries.length} planned dates · {program.weeks} weeks ·
              through {formatDate(preview.endDate)}
            </p>
            {impact && (
              <p className="fine-print">
                {mode === "replace"
                  ? `${impact.replaceable.length} unstarted calendar entries will be removed. `
                  : "Your existing calendar entries will stay. "}
                {impact.preserved} rest, skipped or recorded entries preserved.
                Existing occurrences are added once.
              </p>
            )}
            <div
              className="program-preview"
              tabIndex={0}
              role="region"
              aria-label="Program calendar preview"
            >
              {preview.entries.map((entry) => (
                <div className="list-row" key={entry.date}>
                  <div>
                    <strong>
                      {formatDate(entry.date, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                    <small className="muted">
                      Week {entry.blockWeek}
                      {entry.phase ? ` · ${entry.phase.name}` : ""}
                      {entry.lighter ? " · Lighter week" : ""}
                      {data.schedule.some(
                        (s) => s.date === entry.date && s.status === "rest",
                      )
                        ? " · Preserved rest day"
                        : ""}
                    </small>
                  </div>
                  <span>
                    {data.templates.find(
                      (template) => template.id === entry.baseTemplateId,
                    )?.name ?? "Unavailable workout"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {(error || validation || preview?.missingTemplateIds.length) && (
          <p role="alert" className="error-text">
            {error ||
              validation ||
              "Edit this program to replace unavailable workouts."}
          </p>
        )}
        <button
          className="btn primary full-width"
          disabled={
            busy ||
            Boolean(validation) ||
            Boolean(preview?.missingTemplateIds.length)
          }
        >
          {busy ? "Saving…" : "Add workouts to calendar"}
        </button>
      </form>
    </Sheet>
  );
}
