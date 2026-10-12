import type {
  AppData,
  Program,
  ProgramPhase,
  Schedule,
  Template,
} from "./types";
import { addDays, dateKey, id, parseDate } from "./helpers";

export interface PlanningEntry {
  date: string;
  baseTemplateId: string;
  blockWeek: number;
  lighter: boolean;
  phase?: ProgramPhase;
}
export interface ProgramPreview {
  startDate: string;
  endDate: string;
  entries: PlanningEntry[];
  missingTemplateIds: string[];
}
export type ApplyMode = "keep" | "replace";

/** Rotate a preset's weekly spacing so its first training day is the chosen start date. */
export function alignTrainingDays(days: number[], startDate: string): number[] {
  const startDay = parseDate(startDate).getDay();
  if (days.includes(startDay)) return [...new Set(days)];
  const ordered = [...new Set(days)].sort(
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
  );
  if (!ordered.length) return [];
  const shift = (startDay - ordered[0] + 7) % 7;
  return ordered.map((day) => (day + shift) % 7);
}

export function programValidation(program: Program): string | null {
  if (!program.name.trim()) return "Give the program a name.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(program.startDate) ||
    dateKey(parseDate(program.startDate)) !== program.startDate
  )
    return "Choose a valid start date.";
  if (
    !Number.isInteger(program.weeks) ||
    program.weeks < 1 ||
    program.weeks > 104
  )
    return "Choose a block length between 1 and 104 weeks.";
  if (
    !program.days.length ||
    program.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    return "Choose at least one training day.";
  if (!program.templateIds.length)
    return "Choose at least one workout for the rotation.";
  if (
    program.deloadWeek !== undefined &&
    (!Number.isInteger(program.deloadWeek) ||
      program.deloadWeek < 1 ||
      program.deloadWeek > program.weeks)
  )
    return "Choose a lighter week within this block.";
  const phases = [...(program.phases ?? [])].sort(
    (a, b) => a.startWeek - b.startWeek,
  );
  if (new Set(phases.map((phase) => phase.id)).size !== phases.length)
    return "Each phase must have a unique identity.";
  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    if (!phase.name.trim()) return "Give every phase a name.";
    if (
      !Number.isInteger(phase.startWeek) ||
      !Number.isInteger(phase.endWeek) ||
      phase.startWeek < 1 ||
      phase.endWeek < phase.startWeek ||
      phase.endWeek > program.weeks
    )
      return `${phase.name}: choose weeks within this block.`;
    if (index && phase.startWeek <= phases[index - 1].endWeek)
      return "Phase weeks must not overlap.";
    if (
      !Number.isFinite(phase.setsMultiplier) ||
      phase.setsMultiplier < 0.1 ||
      phase.setsMultiplier > 3 ||
      !Number.isFinite(phase.loadMultiplier) ||
      phase.loadMultiplier < 0 ||
      phase.loadMultiplier > 2
    )
      return `${phase.name}: use set volume from 10–300% and load from 0–200%.`;
    if (
      (phase.repMin === undefined) !== (phase.repMax === undefined) ||
      (phase.repMin !== undefined &&
        (!Number.isInteger(phase.repMin) ||
          !Number.isInteger(phase.repMax) ||
          phase.repMin < 1 ||
          phase.repMax! < phase.repMin ||
          phase.repMax! > 1000))
    )
      return `${phase.name}: set both ends of a valid repetition range.`;
  }
  return null;
}

export function previewProgram(
  program: Program,
  templates: Template[],
): ProgramPreview {
  const error = programValidation(program);
  if (error) throw new Error(error);
  const missingTemplateIds = program.templateIds.filter(
    (templateId) =>
      !templates.some(
        (template) => template.id === templateId && !template.archived,
      ),
  );
  const entries: PlanningEntry[] = [];
  let rotation = 0;
  for (let day = 0; day < program.weeks * 7; day++) {
    const date = addDays(program.startDate, day);
    if (!program.days.includes(parseDate(date).getDay())) continue;
    const blockWeek = Math.floor(day / 7) + 1;
    entries.push({
      date,
      baseTemplateId:
        program.templateIds[rotation++ % program.templateIds.length],
      blockWeek,
      lighter: program.deloadWeek === blockWeek,
      phase: program.phases?.find(
        (phase) => phase.startWeek <= blockWeek && phase.endWeek >= blockWeek,
      ),
    });
  }
  return {
    startDate: program.startDate,
    endDate: addDays(program.startDate, program.weeks * 7 - 1),
    entries,
    missingTemplateIds,
  };
}

function protectedScheduleIds(data: AppData): Set<string> {
  return new Set(
    [
      data.activeSession?.scheduleId,
      ...data.sessions.map((session) => session.scheduleId),
    ].filter((value): value is string => Boolean(value)),
  );
}
export function programImpact(data: AppData, preview: ProgramPreview) {
  const protectedIds = protectedScheduleIds(data);
  const inRange = data.schedule.filter(
    (entry) => entry.date >= preview.startDate && entry.date <= preview.endDate,
  );
  const replaceable = inRange.filter(
    (entry) =>
      entry.status === "planned" &&
      !entry.sessionId &&
      !protectedIds.has(entry.id),
  );
  return { replaceable, preserved: inRange.length - replaceable.length };
}

function variantSignature(base: Template, entry: PlanningEntry): string {
  return JSON.stringify(
    {
      name: base.name,
      exercises: base.exercises,
      phase: entry.phase,
      lighter: entry.lighter,
    },
    (_, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          )
        : value,
  );
}
function plannedTemplate(
  data: AppData,
  program: Program,
  entry: PlanningEntry,
): Template {
  const base = data.templates.find(
    (template) => template.id === entry.baseTemplateId,
  )!;
  if (!entry.phase && !entry.lighter) return base;
  const signature = variantSignature(base, entry);
  const existing = data.templates.find(
    (template) =>
      !template.archived &&
      template.planningSource?.programId === program.id &&
      template.planningSource.startDate === program.startDate &&
      template.planningSource.templateId === base.id &&
      template.planningSource.signature === signature,
  );
  if (existing) return existing;
  const setsMultiplier =
    (entry.phase?.setsMultiplier ?? 1) * (entry.lighter ? 0.67 : 1);
  const loadMultiplier =
    (entry.phase?.loadMultiplier ?? 1) * (entry.lighter ? 0.9 : 1);
  const label = [entry.phase?.name, entry.lighter ? "lighter" : undefined]
    .filter(Boolean)
    .join(" · ");
  const template: Template = {
    ...structuredClone(base),
    id: id(),
    name: `${program.name} · ${label} · ${base.name}`,
    archived: false,
    description: `Planned ${label} version. ${Math.round(setsMultiplier * 100)}% of base sets, ${Math.round(loadMultiplier * 100)}% of base load${entry.phase?.repMin !== undefined ? `, ${entry.phase.repMin}–${entry.phase.repMax} reps for repetition-based movements` : ""}. Review these targets for your needs.`,
    exercises: base.exercises.map((prescription) => {
      const exercise = data.exercises.find(
        (exercise) => exercise.id === prescription.exerciseId,
      );
      const timed =
        exercise?.measurement === "duration" ||
        exercise?.measurement === "cardio";
      return {
        ...structuredClone(prescription),
        id: id(),
        sets: Math.min(
          100,
          Math.max(1, Math.round(prescription.sets * setsMultiplier)),
        ),
        weightKg:
          Math.round(prescription.weightKg * loadMultiplier * 100) / 100,
        ...(!timed && entry.phase?.repMin !== undefined
          ? { repMin: entry.phase.repMin, repMax: entry.phase.repMax! }
          : {}),
      };
    }),
    updatedAt: new Date().toISOString(),
    planningSource: {
      programId: program.id,
      templateId: base.id,
      startDate: program.startDate,
      phaseId: entry.phase?.id,
      lighter: entry.lighter,
      signature,
    },
  };
  data.templates.push(template);
  return template;
}

/** Persist a reviewed block into a mutable app draft, preserving session-linked calendar records. */
export function applyProgram(
  data: AppData,
  program: Program,
  { mode = "keep" }: { mode?: ApplyMode } = {},
) {
  const preview = previewProgram(program, data.templates);
  if (preview.missingTemplateIds.length)
    throw new Error(
      "This program includes archived or missing workouts. Edit its rotation before applying it.",
    );
  const impact = programImpact(data, preview);
  const replaceIds = new Set(
    mode === "replace" ? impact.replaceable.map((entry) => entry.id) : [],
  );
  const existingProgram = data.programs.findIndex(
    (value) => value.id === program.id,
  );
  const value = {
    ...structuredClone(program),
    name: program.name.trim(),
    archived: false,
  };
  if (existingProgram < 0) data.programs.push(value);
  else data.programs[existingProgram] = value;
  data.schedule = data.schedule.filter((entry) => !replaceIds.has(entry.id));
  let added = 0;
  for (const entry of preview.entries) {
    // Respect explicit rest days and the recorded choice for an existing occurrence,
    // even when edited phase targets would create a different template variant.
    if (
      data.schedule.some(
        (scheduled) =>
          scheduled.date === entry.date &&
          (scheduled.status === "rest" ||
            (scheduled.programId === program.id &&
              (scheduled.status !== "planned" ||
                scheduled.sessionId ||
                protectedScheduleIds(data).has(scheduled.id)) &&
              (scheduled.templateId === entry.baseTemplateId ||
                data.templates.find(
                  (template) => template.id === scheduled.templateId,
                )?.planningSource?.templateId === entry.baseTemplateId))),
      )
    )
      continue;
    const template = plannedTemplate(data, program, entry);
    // A skipped or completed occurrence stays the user's choice when a block is reapplied.
    if (
      data.schedule.some(
        (scheduled) =>
          scheduled.date === entry.date && scheduled.templateId === template.id,
      )
    )
      continue;
    const scheduled: Schedule = {
      id: id(),
      date: entry.date,
      templateId: template.id,
      status: "planned",
      programId: program.id,
      blockWeek: entry.blockWeek,
      phaseName: entry.phase?.name,
    };
    data.schedule.push(scheduled);
    added++;
  }
  return {
    added,
    replaced: replaceIds.size,
    preserved: impact.preserved,
    preview,
  };
}
