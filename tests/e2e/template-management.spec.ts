import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  choose,
  formControl,
  persisted,
  quickOnboard,
  writeData,
} from "./helpers";
import { createSession, completeSession } from "../../src/domain/session";
import { addDays } from "../../src/domain/helpers";

async function nav(page: Page, screen: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: screen, exact: true })
    .click();
}
async function workouts(page: Page) {
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Workouts", exact: true }).click();
}

test("starter icons differ, chosen icons persist and new workouts lead unless an explicit sort is chosen", async ({
  page,
}) => {
  await quickOnboard(page);
  await workouts(page);
  const starter = await page
    .locator(".template-row .workout-icon")
    .evaluateAll((icons) =>
      icons.map((icon) => icon.getAttribute("data-icon-id")),
    );
  expect(starter).toHaveLength(15);
  expect(new Set(starter).size).toBe(15);
  await page
    .getByRole("button", { name: "Create workout", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Create workout",
    exact: true,
  });
  await formControl(editor, "Workout name").fill("Zeta morning practice");
  await editor
    .getByRole("button", { name: "Choose workout icon", exact: true })
    .click();
  const icons = page.getByRole("dialog", {
    name: "Workout icon library",
    exact: true,
  });
  await expect(
    icons.getByRole("button", { name: /^Use .* icon$/ }),
  ).toHaveCount(22);
  await icons
    .getByRole("button", { name: "Use Cycling icon", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(icons).not.toBeVisible();
  await editor
    .getByRole("button", { name: "Add movement", exact: true })
    .click();
  await formControl(editor, "Search exercises").fill("Pushups");
  await editor
    .getByRole("button", { name: "Add Pushups", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(page.locator(".template-row").first()).toContainText(
    "Zeta morning practice",
  );
  await expect(
    page.locator(".template-row").first().locator(".workout-icon"),
  ).toHaveAttribute("data-icon-id", "cycling");
  await choose(formControl(page, "Sort workouts"), "name");
  await expect(page.locator(".template-row").last()).toContainText(
    "Zeta morning practice",
  );
  await choose(formControl(page, "Sort workouts"), "recent");
  await page
    .locator(".template-row")
    .first()
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit workout", exact: true });
  await edit
    .getByRole("button", { name: "Choose workout icon", exact: true })
    .click();
  await expect(
    icons.getByRole("button", { name: "Use Cycling icon", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await icons
    .getByRole("button", { name: "Use Running icon", exact: true })
    .click();
  await edit.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.reload();
  await workouts(page);
  await expect(page.locator(".template-row").first()).toContainText(
    "Zeta morning practice",
  );
  await expect(
    page.locator(".template-row").first().locator(".workout-icon"),
  ).toHaveAttribute("data-icon-id", "running");
  expect(
    (await persisted(page)).templates.find(
      (template) => template.name === "Zeta morning practice",
    )!.icon,
  ).toBe("running");
  await nav(page, "Train");
  await page
    .getByRole("button", { name: "Workout library", exact: true })
    .click();
  await expect(page.locator(".template-card").first()).toContainText(
    "Zeta morning practice",
  );
});

test("delete review can be canceled and permanent deletion preserves completed history and the active workout", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page),
    target = data.templates.find((template) => template.id === "tpl-full-a")!;
  const today = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  data.schedule = [
    {
      id: "delete-done",
      date: today,
      templateId: target.id,
      status: "planned",
    },
    {
      id: "delete-active",
      date: today,
      templateId: target.id,
      status: "planned",
    },
    {
      id: "delete-future",
      date: addDays(today, 1),
      templateId: target.id,
      status: "planned",
    },
    {
      id: "delete-skipped",
      date: addDays(today, -1),
      templateId: target.id,
      status: "skipped",
    },
    {
      id: "keep-rest",
      date: addDays(today, 2),
      templateId: "",
      status: "rest",
    },
  ];
  const old = createSession(data, target, "delete-done");
  old.exercises[0].sets[0].completed = true;
  old.exercises[0].sets[0].reps = 6;
  completeSession(data, old);
  data.activeSession = createSession(data, target, "delete-active");
  const first = data.activeSession.exercises[0];
  first.sets[0].weightKg = 81;
  first.sets[0].reps = 9;
  first.sets[0].completed = true;
  data.activeSession.focusedExerciseId = first.id;
  data.programs = [
    {
      ...data.programs[0],
      name: "Delete review block",
      templateIds: [target.id],
    },
  ];
  await writeData(page, data);
  const before = await persisted(page);
  await workouts(page);
  await page
    .locator(".template-row")
    .filter({ hasText: target.name })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit workout", exact: true });
  await edit
    .getByRole("button", { name: `Delete ${target.name}`, exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Delete workout",
    exact: true,
  });
  await expect(review).toContainText(
    "2 unstarted calendar entries will be removed",
  );
  await expect(review).toContainText("1 program will stop using this workout");
  await expect(review).toContainText(
    "1 saved session and 2 linked calendar entries will stay intact",
  );
  await expect(review).toContainText(
    "Your active workout, logged sets and rest timer will stay intact",
  );
  await review
    .getByRole("button", { name: "Keep workout", exact: true })
    .click();
  expect((await persisted(page)).templates).toEqual(before.templates);
  await edit
    .getByRole("button", { name: `Delete ${target.name}`, exact: true })
    .click();
  expect(
    (await new AxeBuilder({ page }).include("dialog[open]").analyze())
      .violations,
  ).toEqual([]);
  await review
    .getByRole("button", { name: "Delete workout", exact: true })
    .click();
  await expect(edit).not.toBeVisible();
  const after = await persisted(page);
  expect(after.templates.some((template) => template.id === target.id)).toBe(
    false,
  );
  expect(after.sessions).toEqual(before.sessions);
  expect(after.activeSession).toEqual(before.activeSession);
  expect(after.schedule.map((entry) => entry.id)).toEqual([
    "delete-done",
    "delete-active",
    "keep-rest",
  ]);
  expect(after.schedule.slice(0, 2).map((entry) => entry.templateId)).toEqual([
    "",
    "",
  ]);
  expect(after.programs[0].templateIds).toEqual([]);
  await page
    .getByRole("button", { name: "Show archived", exact: true })
    .click();
  await expect(
    page.locator(".template-row").filter({ hasText: target.name }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(
    page.locator(".scheduled-workout.completed .schedule-main"),
  ).toContainText(target.name);
  await page.reload();
  await page.locator(".resume-banner").click();
  await expect(
    formControl(page, `${first.exercise.name} set 1 weight`, { exact: true }),
  ).toHaveValue("81");
  await expect(
    formControl(page, `${first.exercise.name} set 1 reps`, { exact: true }),
  ).toHaveValue("9");
  await expect(
    page.getByRole("button", {
      name: `Undo ${first.exercise.name} set 1`,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s train.", exact: true }),
  ).toBeVisible();
  const finished = await persisted(page);
  expect(finished.activeSession).toBeNull();
  expect(finished.sessions).toHaveLength(2);
  expect(finished.sessions[0]).toEqual(before.sessions[0]);
  expect(
    finished.schedule.find((entry) => entry.id === "delete-active")!.status,
  ).toBe("completed");
  expect(finished.sessions[1].exercises[0].sets[0]).toMatchObject({
    weightKg: 81,
    reps: 9,
    completed: true,
  });
});

test("program spacing and the icon library remain accessible on small phones and landscape", async ({
  page,
}, testInfo) => {
  await quickOnboard(page);
  await nav(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 393, height: 852 },
    { width: 740, height: 393 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".plan-program-list .program-row")
        .first()
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingLeft),
        ),
    ).toBeGreaterThanOrEqual(18);
    expect(
      await page
        .locator(".plan-program-list")
        .evaluate((element) => parseFloat(getComputedStyle(element).rowGap)),
    ).toBeGreaterThanOrEqual(16);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Create workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose workout icon", exact: true })
    .click();
  const icons = page.getByRole("dialog", {
    name: "Workout icon library",
    exact: true,
  });
  await icons.evaluate((element) => {
    element.style.fontSize = "20px";
  });
  expect(
    (await new AxeBuilder({ page }).include("dialog[open]").analyze())
      .violations,
  ).toEqual([]);
  for (const button of await icons
    .getByRole("button", { name: /^Use .* icon$/ })
    .all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("icon-picker-small-phone.png"),
    fullPage: true,
  });
});
