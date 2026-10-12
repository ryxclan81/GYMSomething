import type { AppData, Schedule, Session, Template } from "./types";

export type TemplateSort = "recent" | "name" | "focus" | "duration";
export const templateSortOptions = [
  { value: "recent", label: "Recently saved" },
  { value: "name", label: "Name A–Z" },
  { value: "focus", label: "Training focus" },
  { value: "duration", label: "Shortest first" },
] as const;
const compareName = (a: Template, b: Template) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });

/** Returns a new list; equal timestamps retain the user's current list order. */
export function sortTemplates(
  templates: readonly Template[],
  sort: TemplateSort = "recent",
): Template[] {
  return templates
    .map((template, index) => ({ template, index }))
    .sort((a, b) => {
      const left = a.template,
        right = b.template;
      const order =
        sort === "name"
          ? compareName(left, right)
          : sort === "focus"
            ? left.focus.localeCompare(right.focus) || compareName(left, right)
            : sort === "duration"
              ? left.minutes - right.minutes || compareName(left, right)
              : (Date.parse(right.updatedAt) || 0) -
                (Date.parse(left.updatedAt) || 0);
      return order || a.index - b.index;
    })
    .map(({ template }) => template);
}

/** Calendar records can still point to the saved session after its template is deleted. */
export function scheduledSession(
  data: AppData,
  entry: Schedule,
): Session | undefined {
  return (
    data.sessions.find(
      (session) =>
        Boolean(session.completedAt) &&
        (session.id === entry.sessionId || session.scheduleId === entry.id),
    ) ??
    (data.activeSession &&
    (data.activeSession.id === entry.sessionId ||
      data.activeSession.scheduleId === entry.id)
      ? data.activeSession
      : undefined)
  );
}

export function templateDeletionImpact(data: AppData, templateId: string) {
  const matching = data.schedule.filter(
    (entry) => entry.templateId === templateId && entry.status !== "rest",
  );
  const retained = matching.filter((entry) => scheduledSession(data, entry));
  const blocked = matching.filter(
    (entry) => entry.status === "completed" && !scheduledSession(data, entry),
  );
  const removed = matching.filter(
    (entry) => !retained.includes(entry) && !blocked.includes(entry),
  );
  const programs = data.programs.filter((program) =>
    program.templateIds.includes(templateId),
  );
  return {
    exists: data.templates.some((template) => template.id === templateId),
    removed,
    retained,
    blocked,
    programs,
    emptyPrograms: programs.filter((program) =>
      program.templateIds.every((id) => id === templateId),
    ),
    historyCount: data.sessions.filter(
      (session) => session.templateId === templateId,
    ).length,
    preservesActive: data.activeSession?.templateId === templateId,
    pendingSuggestions: data.suggestions.filter(
      (suggestion) =>
        suggestion.templateId === templateId &&
        ["pending", "snoozed"].includes(suggestion.status),
    ).length,
  };
}

/** Removes the template, never session snapshots; the store validates detached calendar links. */
export function deleteTemplate(data: AppData, templateId: string) {
  const impact = templateDeletionImpact(data, templateId);
  if (!impact.exists) throw new Error("This workout has already been deleted.");
  if (impact.blocked.length)
    throw new Error(
      "A completed calendar record has no saved workout attached. Remove that calendar entry or archive this template to preserve it.",
    );
  const removedIds = new Set(impact.removed.map((entry) => entry.id));
  const retainedIds = new Set(impact.retained.map((entry) => entry.id));
  data.templates = data.templates.filter(
    (template) => template.id !== templateId,
  );
  data.schedule = data.schedule.filter((entry) => !removedIds.has(entry.id));
  for (const entry of data.schedule) {
    if (retainedIds.has(entry.id)) {
      const snapshot = scheduledSession(data, entry)!;
      entry.templateId = "";
      entry.sessionId = snapshot.id;
    }
  }
  for (const program of data.programs)
    program.templateIds = program.templateIds.filter((id) => id !== templateId);
  for (const suggestion of data.suggestions)
    if (
      suggestion.templateId === templateId &&
      ["pending", "snoozed"].includes(suggestion.status)
    ) {
      suggestion.status = "dismissed";
      suggestion.reason += " This workout template was deleted.";
    }
  return impact;
}
