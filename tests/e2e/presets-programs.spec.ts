import { expect, test, type Page } from "@playwright/test";
import { equipmentCompatibility } from "../../src/domain/engine";
import { createSession, completeSession } from "../../src/domain/session";
import {
  choose,
  formControl,
  persisted,
  quickOnboard,
  writeData,
} from "./helpers";

async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function freshSetup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  return page.getByRole("dialog", { name: "Welcome to Setwise" });
}

test("new onboarding defaults to an empty personal library, and matching presets are an explicit later choice", async ({
  page,
}) => {
  const setup = await freshSetup(page);
  await setup
    .getByRole("button", { name: "Use defaults", exact: true })
    .click();
  await expect(
    setup.getByRole("button", { name: "Start empty", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    formControl(setup, "Also schedule two starter weeks"),
  ).toHaveCount(0);
  await setup
    .getByRole("button", { name: "Let’s get started", exact: true })
    .click();
  let data = await persisted(page);
  expect(data.templates).toEqual([]);
  expect(data.programs).toEqual([]);
  expect(data.schedule).toEqual([]);
  expect(data.sessions).toEqual([]);
  await page.reload();
  await nav(page, "Plan");
  await page
    .locator(".plan-page .segmented-control")
    .getByRole("button", { name: "Workouts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Browse matching presets", exact: true })
    .click();
  const review = page.getByRole("dialog", { name: "Matching starter presets" });
  const count = await review.locator(".preset-preview").count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(4);
  expect((await persisted(page)).templates).toEqual([]);
  await review
    .getByRole("button", { name: /^Add \d matching presets?$/ })
    .click();
  data = await persisted(page);
  expect(data.templates).toHaveLength(count);
  expect(data.programs).toHaveLength(1);
  expect(data.programs[0].weeks).toBeUndefined();
  expect(data.schedule).toEqual([]);
  expect(data.sessions).toEqual([]);
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await page
    .locator(".program-row")
    .getByRole("button", { name: "Use program", exact: true })
    .click();
  const programReview = page.getByRole("dialog", { name: /^Use / });
  await choose(
    formControl(programReview, "Schedule length (weeks)"),
    "2 weeks",
    true,
  );
  await programReview
    .getByRole("button", { name: "Add workouts to calendar", exact: true })
    .click();
  data = await persisted(page);
  expect(data.schedule).toHaveLength(6);
  expect(data.programs[0].weeks).toBeUndefined();
  await page.reload();
  data = await persisted(page);
  expect(data.schedule).toHaveLength(6);
  expect(data.programs[0].weeks).toBeUndefined();
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await expect(page.locator(".program-row")).toContainText("REUSABLE PROGRAM");
});

test("floor calisthenics opt-in adds only compatible presets and schedules only when requested", async ({
  page,
}) => {
  const setup = await freshSetup(page);
  await choose(formControl(setup, "Primary focus"), "Calisthenics");
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await formControl(setup, "Preferred session length (minutes)").fill("35");
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await setup.getByRole("button", { name: /^Bodyweight \/ Travel/ }).click();
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await setup
    .getByRole("button", { name: "Add matching presets", exact: true })
    .click();
  await expect(setup.locator(".preset-onboarding-summary")).toContainText(
    "Floor Bodyweight",
  );
  await expect(
    formControl(setup, "Also schedule two starter weeks"),
  ).not.toBeChecked();
  await formControl(setup, "Also schedule two starter weeks").check();
  await setup
    .getByRole("button", { name: "Let’s get started", exact: true })
    .click();
  const data = await persisted(page);
  expect(data.templates).toHaveLength(1);
  expect(data.programs).toHaveLength(1);
  expect(data.programs[0].weeks).toBeUndefined();
  expect(data.schedule).toHaveLength(6);
  expect(data.sessions).toEqual([]);
  const environment = data.equipment.find(
    (item) => item.id === data.activeEquipmentId,
  )!;
  for (const target of data.templates[0].exercises)
    expect(
      equipmentCompatibility(
        data.exercises.find((exercise) => exercise.id === target.exerciseId)!,
        environment,
      ).compatible,
    ).toBe(true);
  expect(
    data.templates[0].exercises.some(
      (entry) => entry.exerciseId === "ex-pullups",
    ),
  ).toBe(false);
  await page.reload();
  expect((await persisted(page)).templates[0].name).toBe("Floor Bodyweight");
  expect((await persisted(page)).programs[0].weeks).toBeUndefined();
});

test("deleting a program keeps saved workout templates, calendar dates and completed history", async ({
  page,
}) => {
  await quickOnboard(page);
  const fixture = await persisted(page);
  const program = fixture.programs.find((item) => item.id === "prg-full")!;
  const template = fixture.templates.find(
    (item) => item.id === program.templateIds[0],
  )!;
  fixture.schedule = [
    {
      id: "program-done",
      date: "2026-10-01",
      templateId: template.id,
      status: "planned",
      programId: program.id,
      blockWeek: 1,
    },
    {
      id: "program-plan",
      date: "2026-11-01",
      templateId: template.id,
      status: "planned",
      programId: program.id,
      blockWeek: 2,
    },
  ];
  const session = createSession(fixture, template, "program-done");
  session.exercises[0].sets[0].completed = true;
  completeSession(fixture, session);
  const history = structuredClone(fixture.sessions);
  const workouts = structuredClone(fixture.templates);
  await writeData(page, fixture);
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await page
    .getByRole("button", { name: `Edit ${program.name}`, exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit program",
    exact: true,
  });
  await editor
    .getByRole("button", { name: "Delete program", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Delete program",
    exact: true,
  });
  await review
    .getByRole("button", { name: "Keep program", exact: true })
    .click();
  expect(
    (await persisted(page)).programs.some((item) => item.id === program.id),
  ).toBe(true);
  await editor
    .getByRole("button", { name: "Delete program", exact: true })
    .click();
  await review
    .getByRole("button", { name: "Delete program", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  const data = await persisted(page);
  expect(data.programs.some((item) => item.id === program.id)).toBe(false);
  expect(data.templates).toEqual(workouts);
  expect(data.sessions).toEqual(history);
  expect(data.schedule).toHaveLength(2);
  expect(
    data.schedule.every((entry) => !entry.programId && !entry.blockWeek),
  ).toBe(true);
  await page.reload();
  expect((await persisted(page)).sessions).toEqual(history);
});
