import { describe, it, expect } from "vitest";
import { defaultData } from "../data/defaults";
import { inAppReminder, reminderDue, remindersICS } from "./reminders";
describe("reminder timing", () => {
  it("honors enabled days, local time and overnight quiet hours", () => {
    const data = defaultData();
    data.reminders = {
      ...data.reminders,
      enabled: true,
      days: [6],
      time: "18:00",
      quietStart: "22:00",
      quietEnd: "08:00",
      categories: ["scheduled"],
    };
    expect(reminderDue(data, new Date(2026, 9, 10, 19))).toBe(true);
    expect(reminderDue(data, new Date(2026, 9, 10, 23))).toBe(false);
    expect(reminderDue(data, new Date(2026, 9, 10, 7))).toBe(false);
    expect(reminderDue(data, new Date(2026, 9, 11, 19))).toBe(false);
  });
  it("does not generate a reminder when its category is disabled", () => {
    const data = defaultData();
    data.reminders = {
      ...data.reminders,
      enabled: true,
      days: [6],
      time: "18:00",
      categories: [],
    };
    data.schedule = [
      {
        id: "plan",
        date: "2026-10-10",
        templateId: data.templates[0].id,
        status: "planned",
      },
    ];
    expect(inAppReminder(data, new Date(2026, 9, 10, 19))).toBeNull();
    data.reminders.categories = ["scheduled"];
    expect(inAppReminder(data, new Date(2026, 9, 10, 19))?.category).toBe(
      "scheduled",
    );
  });
});
it("exports only future planned sessions, preserving event identity and a real calendar alert", () => {
  const data = defaultData();
  data.reminders.time = "18:30";
  data.schedule = [
    {
      id: "a",
      date: "2026-10-10",
      templateId: data.templates[0].id,
      status: "planned",
    },
    {
      id: "b",
      date: "2026-10-09",
      templateId: data.templates[0].id,
      status: "planned",
    },
    {
      id: "c",
      date: "2026-10-11",
      templateId: data.templates[0].id,
      status: "completed",
    },
  ];
  const file = remindersICS(data, "2026-10-10");
  expect(file).toContain("UID:a@forma.local");
  expect(file).not.toContain("UID:b@forma.local");
  expect(file).not.toContain("UID:c@forma.local");
  expect(file).toContain("BEGIN:VALARM\r\nTRIGGER:-PT15M");
});
