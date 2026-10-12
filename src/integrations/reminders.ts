import type { AppData } from "../domain/types";
import { dateKey, addDays, parseDate } from "../domain/helpers";
function escape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
export function remindersICS(data: AppData, today = dateKey()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Setwise//Workout planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const [hour, minute] = data.reminders.time.split(":").map(Number);
  const schedules = data.schedule.filter(
    (s) =>
      s.status === "planned" && s.date >= today && s.date <= addDays(today, 90),
  );
  for (const schedule of schedules) {
    const start = parseDate(schedule.date);
    start.setHours(hour, minute, 0, 0);
    const template = data.templates.find((t) => t.id === schedule.templateId),
      end = new Date(start.getTime() + (template?.minutes ?? 60) * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${schedule.id}@forma.local`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(template?.name ?? "Training session")}`,
      "DESCRIPTION:Your planned Setwise workout. Open Setwise to train.",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Training in 15 minutes",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
export function reminderDue(data: AppData, now = new Date()): boolean {
  if (!data.reminders.enabled || !data.reminders.days.includes(now.getDay()))
    return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const start = toMinutes(data.reminders.quietStart),
    end = toMinutes(data.reminders.quietEnd);
  const quiet =
    start === end
      ? false
      : start < end
        ? current >= start && current < end
        : current >= start || current < end;
  return !quiet && current >= toMinutes(data.reminders.time);
}
export function inAppReminder(
  data: AppData,
  now = new Date(),
): { category: string; message: string } | null {
  if (!reminderDue(data, now)) return null;
  const categories = data.reminders.categories,
    today = dateKey(now),
    sessions = data.sessions.filter((s) => s.completedAt),
    last = sessions
      .map((s) => s.completedAt!)
      .sort()
      .at(-1);
  const candidates: [string, boolean, string][] = [
    [
      "scheduled",
      data.schedule.some((s) => s.date === today && s.status === "planned"),
      data.reminders.tone === "motivational"
        ? "Your next session is planned. A steady step toward your goal."
        : data.reminders.tone === "friendly"
          ? "A workout is on your calendar today. Ready when you are."
          : "A training session is planned for today.",
    ],
    [
      "missed",
      data.schedule.some(
        (s) =>
          s.date < today &&
          s.date >= addDays(today, -7) &&
          s.status === "planned",
      ),
      "A recent session is still planned. Reschedule it to fit your week.",
    ],
    [
      "review",
      data.suggestions.some((s) => s.status === "pending"),
      "A progression suggestion is ready to review.",
    ],
    [
      "return",
      Boolean(last && last.slice(0, 10) < addDays(today, -14)),
      "It has been a little while. Start with a manageable session when you are ready.",
    ],
    [
      "weekly",
      now.getDay() === 0 &&
        sessions.some((s) => s.completedAt!.slice(0, 10) >= addDays(today, -6)),
      "Review your weekly progress. Planned rest supports consistency too.",
    ],
    [
      "milestone",
      [1, 10, 50, 100].includes(sessions.length),
      "You have reached a workout milestone. See your progress.",
    ],
    [
      "program",
      data.programs.some(
        (p) =>
          !p.archived &&
          p.startDate &&
          addDays(p.startDate, p.weeks * 7) <= today,
      ),
      "A program block has reached its planned end. Review your next training phase.",
    ],
    [
      "rest",
      Boolean(
        data.activeSession?.restEndsAt &&
        data.activeSession.restEndsAt <= now.getTime(),
      ),
      "Your rest timer has finished. Continue when you are ready.",
    ],
  ];
  const found = candidates.find(
    ([category, eligible]) => categories.includes(category) && eligible,
  );
  return found ? { category: found[0], message: found[2] } : null;
}
