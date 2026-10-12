import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addDays } from "../../src/domain/helpers";
import { createSession } from "../../src/domain/session";
import {
  formControl,
  choose,
  persisted,
  quickOnboard,
  writeData,
} from "./helpers";

async function nav(page: Page, screen: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: screen, exact: true })
    .click();
}
async function today(page: Page) {
  return page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}
async function useProgram(page: Page, name: string): Promise<Locator> {
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await page
    .locator(".program-row")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Use program", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: `Use ${name}`, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("a preset previews actual dates, applies to Home and Today, and can be reapplied once", async ({
  page,
}) => {
  await quickOnboard(page);
  const before = await persisted(page);
  const day = await today(page);
  let dialog = await useProgram(page, "Full Body · 3 days");
  await expect(formControl(dialog, "Start date", { exact: true })).toHaveValue(
    day,
  );
  await expect(
    formControl(dialog, "First workout on the start date"),
  ).toBeChecked();
  await expect(dialog.locator(".program-preview .list-row")).toHaveCount(18);
  await expect(
    dialog.locator(".program-preview .list-row").first(),
  ).toContainText("Full Body A");
  expect((await persisted(page)).schedule).toEqual(before.schedule);
  expect(
    (await new AxeBuilder({ page }).include(".sheet").analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "artifacts/screenshots/planning-preset-preview.png",
  });
  await dialog
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const applied = await persisted(page);
  const occurrences = applied.schedule.filter(
    (entry) => entry.programId === "prg-full",
  );
  expect(occurrences).toHaveLength(18);
  expect(occurrences[0]).toMatchObject({
    date: day,
    templateId: "tpl-full-a",
    status: "planned",
  });
  expect(applied.activeSession).toBeNull();
  expect(applied.sessions).toEqual(before.sessions);
  await nav(page, "Home");
  await expect(
    page.getByRole("button", { name: "Start Full Body A", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/daily-workouts-mobile.png",
  });
  await nav(page, "Train");
  await expect(
    page.getByRole("button", { name: "Today", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Start Full Body A", exact: true }),
  ).toBeVisible();
  await page.reload();
  dialog = await useProgram(page, "Full Body · 3 days");
  await dialog
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const repeated = await persisted(page);
  expect(repeated.schedule).toEqual(applied.schedule);
  expect(
    repeated.programs.find((program) => program.id === "prg-full")!.days,
  ).toEqual(
    applied.programs.find((program) => program.id === "prg-full")!.days,
  );
});

test("two workouts on one day remain selectable and the chosen calendar entry survives logging and reload", async ({
  page,
}) => {
  await quickOnboard(page);
  const fixture = await persisted(page);
  fixture.schedule = [];
  await writeData(page, fixture);
  await nav(page, "Plan");
  for (const name of ["Full Body A", "Full Body B"]) {
    await page.locator(".calendar-day.today").click();
    const dialog = page.getByRole("dialog", { name: /^Plan / });
    await dialog.getByRole("button", { name: new RegExp(`^${name} `) }).click();
    await expect(dialog).not.toBeVisible();
  }
  const scheduled = await persisted(page);
  const chosen = scheduled.schedule.find(
    (entry) => entry.templateId === "tpl-full-b",
  )!;
  expect(scheduled.schedule).toHaveLength(2);
  await nav(page, "Home");
  await expect(page.locator(".daily-workout")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Start Full Body A", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Full Body B", exact: true }),
  ).toBeVisible();
  await nav(page, "Train");
  await expect(page.locator(".daily-workout")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Start Full Body B", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Full Body B", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workout-overview-card")).toHaveCount(4);
  let data = await persisted(page);
  expect(data.activeSession!.scheduleId).toBe(chosen.id);
  const first = data.activeSession!.exercises[0];
  await page
    .getByRole("button", { name: `Open ${first.exercise.name}`, exact: true })
    .click();
  await formControl(page, `${first.exercise.name} set 1 reps`, {
    exact: true,
  }).fill("9");
  await page
    .getByRole("button", {
      name: `Complete ${first.exercise.name} set 1`,
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start Full Body A", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resume Full Body B", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: first.exercise.name, exact: true }),
  ).toBeVisible();
  await expect(
    formControl(page, `${first.exercise.name} set 1 reps`, { exact: true }),
  ).toHaveValue("9");
  data = await persisted(page);
  expect(data.activeSession!.scheduleId).toBe(chosen.id);
  expect(data.activeSession!.focusedExerciseId).toBe(first.id);
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Work put in." }),
  ).toBeVisible();
  data = await persisted(page);
  expect(data.sessions[0].scheduleId).toBe(chosen.id);
  expect(data.schedule.find((entry) => entry.id === chosen.id)!.status).toBe(
    "completed",
  );
  expect(data.schedule.find((entry) => entry.id !== chosen.id)!.status).toBe(
    "planned",
  );
});

test("phase targets made in the editor become separate saved workout versions and stay frozen when the base is edited", async ({
  page,
}) => {
  await quickOnboard(page);
  const fixture = await persisted(page);
  const day = await today(page);
  const base = fixture.templates.find(
    (template) => template.id === "tpl-full-a",
  )!;
  base.exercises[0].weightKg = 50;
  fixture.schedule = [
    { id: "phase-rest", date: addDays(day, 1), templateId: "", status: "rest" },
  ];
  await writeData(page, fixture);
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await page.getByRole("button", { name: "New program", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "New training block",
    exact: true,
  });
  await formControl(editor, "Program name", { exact: true }).fill(
    "Two phase practice",
  );
  await choose(formControl(editor, "Block length"), "2 weeks", true);
  const weekday = await page.evaluate(() =>
    new Date().toLocaleDateString("en-US", { weekday: "short" }),
  );
  for (const label of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    const button = editor.getByRole("button", { name: label, exact: true });
    const pressed = (await button.getAttribute("aria-pressed")) === "true";
    if (pressed !== (label === weekday)) await button.click();
  }
  await editor
    .locator("label.list-row")
    .filter({ hasText: "Full Body A" })
    .getByRole("checkbox")
    .check();
  await editor.getByRole("button", { name: "Add phase", exact: true }).click();
  let phase = editor.locator(".phase-editor").first();
  await formControl(phase, "Phase name").fill("Accumulation");
  await formControl(phase, "Last week").fill("1");
  await formControl(phase, "Base sets (%)").fill("150");
  await formControl(phase, "Base load (%)").fill("80");
  await formControl(phase, "Minimum reps (optional)").fill("10");
  await formControl(phase, "Maximum reps (optional)").fill("12");
  await editor.getByRole("button", { name: "Add phase", exact: true }).click();
  phase = editor.locator(".phase-editor").last();
  await formControl(phase, "Phase name").fill("Practice");
  await formControl(phase, "Base sets (%)").fill("67");
  await formControl(phase, "Base load (%)").fill("60");
  await formControl(phase, "Minimum reps (optional)").fill("5");
  await formControl(phase, "Maximum reps (optional)").fill("6");
  await expect(
    formControl(editor, "Add this block to my calendar"),
  ).toBeChecked();
  await editor.getByRole("button", { name: "Save block", exact: true }).click();
  await expect(editor).not.toBeVisible();
  let data = await persisted(page);
  const program = data.programs.find(
    (program) => program.name === "Two phase practice",
  )!;
  const versions = data.templates.filter(
    (template) => template.planningSource?.programId === program.id,
  );
  expect(versions).toHaveLength(2);
  const accumulation = versions.find(
    (template) => template.planningSource!.phaseId === program.phases![0].id,
  )!;
  const practice = versions.find(
    (template) => template.planningSource!.phaseId === program.phases![1].id,
  )!;
  expect(accumulation.exercises[0]).toMatchObject({
    sets: 5,
    weightKg: 40,
    repMin: 10,
    repMax: 12,
  });
  expect(practice.exercises[0]).toMatchObject({
    sets: 2,
    weightKg: 30,
    repMin: 5,
    repMax: 6,
  });
  expect(
    data.templates.find((template) => template.id === base.id)!.exercises[0],
  ).toMatchObject({ sets: 3, weightKg: 50, repMin: 8, repMax: 12 });
  expect(data.schedule.find((entry) => entry.id === "phase-rest")!.status).toBe(
    "rest",
  );
  let dialog = await useProgram(page, program.name);
  await expect(dialog.locator(".program-preview")).toContainText(
    "Accumulation",
  );
  await expect(dialog.locator(".program-preview")).toContainText("Practice");
  await dialog
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  dialog = await useProgram(page, program.name);
  await dialog
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  data = await persisted(page);
  expect(
    data.templates
      .filter((template) => template.planningSource?.programId === program.id)
      .map((template) => template.id),
  ).toEqual(versions.map((template) => template.id));
  expect(
    data.schedule.filter((entry) => entry.programId === program.id),
  ).toHaveLength(2);
  await page.getByRole("button", { name: "Workouts", exact: true }).click();
  await page
    .locator(".template-row")
    .filter({
      has: page.getByRole("heading", { name: "Full Body A", exact: true }),
    })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const templateEditor = page.getByRole("dialog", {
    name: "Edit workout",
    exact: true,
  });
  await templateEditor
    .locator(".prescription-editor")
    .first()
    .locator(".text-button")
    .click();
  await formControl(templateEditor, "Target load (kg)", { exact: true }).fill(
    "80",
  );
  await templateEditor
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(templateEditor).not.toBeVisible();
  data = await persisted(page);
  expect(
    data.templates.find((template) => template.id === base.id)!.exercises[0]
      .weightKg,
  ).toBe(80);
  expect(
    data.templates.find((template) => template.id === accumulation.id)!
      .exercises,
  ).toEqual(accumulation.exercises);
  expect(
    data.templates.find((template) => template.id === practice.id)!.exercises,
  ).toEqual(practice.exercises);
  expect(data.schedule.find((entry) => entry.id === "phase-rest")!.status).toBe(
    "rest",
  );
});

test("replacing unstarted plans shows the exact impact and preserves rest, skipped, completed and active records", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const day = await today(page);
  const fullA = data.templates.find(
    (template) => template.id === "tpl-full-a",
  )!;
  const fullB = data.templates.find(
    (template) => template.id === "tpl-full-b",
  )!;
  const saved = createSession(data, fullA, "protected-completed");
  saved.completedAt = new Date().toISOString();
  saved.exercises[0].sets[0].completed = true;
  saved.exercises[0].sets[0].completedAt = saved.completedAt;
  data.sessions = [saved];
  data.activeSession = createSession(data, fullB, "protected-active");
  data.schedule = [
    {
      id: "remove-planned",
      date: day,
      templateId: "tpl-upper-a",
      status: "planned",
    },
    {
      id: "protected-completed",
      date: day,
      templateId: fullA.id,
      status: "completed",
      sessionId: saved.id,
    },
    {
      id: "protected-active",
      date: day,
      templateId: fullB.id,
      status: "planned",
    },
    {
      id: "protected-rest",
      date: addDays(day, 2),
      templateId: "",
      status: "rest",
    },
    {
      id: "protected-skipped",
      date: addDays(day, 3),
      templateId: fullB.id,
      status: "skipped",
    },
    {
      id: "outside-range",
      date: addDays(day, 50),
      templateId: "tpl-upper-b",
      status: "planned",
    },
  ];
  await writeData(page, data);
  const dialog = await useProgram(page, "Full Body · 3 days");
  await choose(
    formControl(dialog, "Existing planned workouts"),
    "Replace unstarted plans in this date range",
    true,
  );
  await expect(dialog).toContainText(
    "1 unstarted calendar entries will be removed.",
  );
  await expect(dialog).toContainText(
    "4 rest, skipped or recorded entries preserved.",
  );
  expect((await persisted(page)).schedule).toEqual(data.schedule);
  await dialog
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const after = await persisted(page);
  expect(after.schedule.some((entry) => entry.id === "remove-planned")).toBe(
    false,
  );
  for (const entry of data.schedule.filter(
    (entry) => entry.id !== "remove-planned",
  )) {
    expect(
      after.schedule.find((savedEntry) => savedEntry.id === entry.id),
    ).toEqual(entry);
  }
  expect(
    after.schedule.filter((entry) => entry.date === addDays(day, 2)),
  ).toEqual([data.schedule.find((entry) => entry.id === "protected-rest")!]);
  expect(after.activeSession).toEqual(data.activeSession);
  expect(after.sessions).toEqual(data.sessions);
  await page.reload();
  const reloaded = await persisted(page);
  expect(reloaded.activeSession).toEqual(data.activeSession);
  expect(reloaded.sessions).toEqual(data.sessions);
});
