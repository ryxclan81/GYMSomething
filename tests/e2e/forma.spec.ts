import {
  formControl,
  quickOnboard,
  persisted as readData,
  choose,
} from "./helpers";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import type { SessionExercise } from "../../src/domain/types";

async function onboard(page: Page) {
  await quickOnboard(page, { name: "Alex" });
}
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function openWorkoutWithPushups(page: Page) {
  await nav(page, "Train");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add an exercise" });
  await formControl(dialog, "Search exercises").fill("Pushups");
  await dialog
    .getByRole("button", { name: "Add Pushups", exact: true })
    .click();
  await page.getByRole("button", { name: "Open Pushups", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pushups", exact: true }),
  ).toBeVisible();
}
async function finishWorkout(page: Page) {
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s train.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review saved workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work put in." }),
  ).toBeVisible();
}

test("new user plans, trains, saves and reviews a real session", async ({
  page,
}) => {
  await onboard(page);
  await expect(page.getByText("0% of weekly target")).toBeVisible();
  await nav(page, "Plan");
  await expect(page.getByRole("heading", { name: "Your plan." })).toBeVisible();
  await page.getByRole("button", { name: "Create workout" }).click();
  await formControl(page, "Workout name").fill("My first workout");
  await page.getByRole("button", { name: "Add movement" }).click();
  await formControl(page, "Search exercises").fill("Pushups");
  await page.getByRole("button", { name: "Add Pushups", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await openWorkoutWithPushups(page);
  await formControl(page, "Pushups set 1 reps", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Complete Pushups set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo Pushups set 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await finishWorkout(page);
  const data = await readData(page);
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0].exercises[0].sets[0].reps).toBe(10);
  expect(data.activeSession).toBeNull();
  await page.getByRole("button", { name: "View progress" }).click();
  await expect(
    page.getByRole("heading", { name: "Your progress." }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/progress-mobile.png",
    fullPage: true,
  });
});
test("offline cold reopen recovers sets and finishes without network", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await openWorkoutWithPushups(page);
  await formControl(page, "Pushups set 1 reps", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Complete Pushups set 1", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await readData(page)).activeSession?.exercises[0].sets[0].completed,
    )
    .toBe(true);
  await context.setOffline(true);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await reopened.getByRole("button", { name: /Open workout.*Resume/ }).click();
  await expect(
    formControl(reopened, "Pushups set 1 reps", { exact: true }),
  ).toHaveValue("12");
  await finishWorkout(reopened);
  expect((await readData(reopened)).sessions).toHaveLength(1);
});
test("home environment shows compatible substitutions and never transfers loads", async ({
  page,
}) => {
  await onboard(page);
  await page
    .locator(".home-page")
    .getByRole("button", {
      name: "Training equipment: Commercial Gym",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: /Home Essentials.*equipment types/ })
    .click();
  await nav(page, "Train");
  await page
    .getByRole("button", { name: "Workout library", exact: true })
    .click();
  await page.getByRole("button", { name: "Adapt & start" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Make this workout yours" });
  await expect(dialog).toBeVisible();
  for (const select of await dialog.getByRole("combobox").all()) {
    await select.click();
    const option = page
      .getByRole("option")
      .filter({ hasNotText: /Choose a substitute|Skip this exercise/ })
      .first();
    await expect(option).toHaveAttribute("data-value", /.+/);
    await option.click();
  }
  await dialog.getByRole("button", { name: "Start adapted workout" }).click();
  await expect(page.getByText("SESSION IN PROGRESS")).toBeVisible();
  const data = await readData(page);
  expect(data.activeSession?.equipmentId).toBe("eq-home");
  expect(
    data.activeSession?.exercises.some(
      (e: SessionExercise) => e.originalExerciseId,
    ),
  ).toBe(true);
  expect(data.templates[0].exercises[0].exerciseId).toBe(
    "ex-barbell-full-squat",
  );
  await page.screenshot({
    path: "artifacts/screenshots/workout-mobile.png",
    fullPage: true,
  });
});
test("custom exercise works in templates, tracking and history", async ({
  page,
}) => {
  await onboard(page);
  await nav(page, "Train");
  await page.getByRole("button", { name: "Exercise library" }).click();
  await page.getByRole("button", { name: "Create custom exercise" }).click();
  await formControl(page, "Name", { exact: true }).fill("Alex floor press");
  await formControl(page, "Primary muscles / activity (comma separated)").fill(
    "Chest",
  );
  await formControl(page, "Instructions", { exact: false }).fill(
    "Lie on the floor. Press controlled dumbbells overhead.",
  );
  await page.getByRole("button", { name: "Save exercise" }).click();
  await formControl(page, "Search exercises").fill("Alex floor press");
  await expect(
    page.getByRole("button", { name: /Alex floor press/ }).first(),
  ).toBeVisible();
  await openWorkoutWithPushups(page);
  await page
    .getByRole("button", { name: "All exercises", exact: true })
    .click();
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add an exercise" });
  await formControl(dialog, "Search exercises").fill("Alex floor press");
  await dialog
    .getByRole("button", { name: "Add Alex floor press", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Alex floor press", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Complete Alex floor press set 1",
      exact: true,
    })
    .click();
  await finishWorkout(page);
  expect(
    (await readData(page)).sessions[0].exercises.some(
      (e: SessionExercise) => e.exercise.name === "Alex floor press",
    ),
  ).toBe(true);
});
test("nutrition manual food, servings, recipe and water are persisted", async ({
  page,
}) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await formControl(page, "Nutrition", { exact: false }).check();
  await page.getByRole("button", { name: "Open nutrition" }).click();
  await page.getByRole("button", { name: "Create custom food" }).click();
  await formControl(page, "Food name").fill("Test oats");
  await formControl(page, "Reference portion (grams)").fill("100");
  await formControl(page, "Calories (kcal)", { exact: true }).fill("380");
  await formControl(page, "Protein (g)", { exact: true }).fill("13");
  await formControl(page, "Carbohydrate (g)", { exact: true }).fill("67");
  await formControl(page, "Fat (g)", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Save food" }).click();
  await formControl(page, "Portions", { exact: true }).fill("0.5");
  await page.getByRole("button", { name: "Add to diary" }).click();
  await expect.poll(async () => (await readData(page)).diary.length).toBe(1);
  expect((await readData(page)).diary[0].servings).toBe(0.5);
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect
    .poll(async () => Object.values((await readData(page)).water))
    .toContain(250);
  await page.getByRole("button", { name: "Recipes & saved meals" }).click();
  await page.getByRole("button", { name: "Create recipe" }).click();
  await formControl(page, "Recipe or meal name").fill("Morning oats");
  await choose(
    formControl(page, "Ingredient from your collection"),
    "Test oats (100 g / portion)",
    true,
  );
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  expect((await readData(page)).recipes[0].name).toBe("Morning oats");
});
test("backup export, clear and restore preserves active workout data", async ({
  page,
}) => {
  await onboard(page);
  await openWorkoutWithPushups(page);
  await formControl(page, "Pushups set 1 reps", { exact: true }).fill("9");
  await page
    .getByRole("button", { name: "All exercises", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: /Backup & data/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download full JSON backup/ }).click();
  const download = await downloadPromise;
  const backup = fs.readFileSync((await download.path())!, "utf8");
  expect(JSON.parse(backup).activeSession.exercises[0].sets[0].reps).toBe(9);
  await page.getByRole("button", { name: "Delete all local app data" }).click();
  await formControl(page, "Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Get started", exact: true }),
  ).toBeVisible();
  await page.reload();
  await onboardAfterReload(page);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: /Backup & data/ }).click();
  await formControl(page, "Choose a JSON backup").setInputFiles({
    name: "forma-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(
    page.getByRole("button", { name: "Review restore" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Review restore" }).click();
  await formControl(page, "Type RESTORE to confirm").fill("RESTORE");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await readData(page)).activeSession?.exercises[0].sets[0].reps,
    )
    .toBe(9);
});

test("a full local store preserves saved records and exports unsaved workout edits", async ({
  page,
}) => {
  await onboard(page);
  await openWorkoutWithPushups(page);
  const saved = await readData(page);
  const before = await page.evaluate(() =>
    localStorage.getItem("forma.data.v1"),
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "forma.data.v1")
        throw new DOMException("Storage is full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await formControl(page, "Pushups set 1 reps", { exact: true }).fill("15");
  await expect(page.getByRole("alert")).toContainText(
    "Changes could not be saved",
  );
  expect(await page.evaluate(() => localStorage.getItem("forma.data.v1"))).toBe(
    before,
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export recovery backup", exact: true })
    .click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  const recovery = JSON.parse(fs.readFileSync(file!, "utf8"));
  expect(recovery.activeSession.exercises[0].sets[0].reps).toBe(15);
  await page
    .getByRole("button", { name: "All exercises", exact: true })
    .click();
  await nav(page, "Home");
  await expect(page.locator(".resume-banner")).toContainText(
    "Unsaved changes — export a backup",
  );
  await page.reload();
  const recoveredSaved = await readData(page);
  expect(recoveredSaved.activeSession!.exercises[0].sets[0].reps).toBe(
    saved.activeSession!.exercises[0].sets[0].reps,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

async function onboardAfterReload(page: Page) {
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await page.getByRole("button", { name: "Use defaults", exact: true }).click();
  await page.getByRole("button", { name: "Let’s get started" }).click();
}
test("responsive screens have no overflow, accessible controls and no default AI", async ({
  page,
}) => {
  await onboard(page);
  await expect(page.getByText("AI permissions & coach")).toHaveCount(0);
  await expect(page.locator(".toast.visible")).toHaveCount(0);
  for (const size of [
    { width: 393, height: 852 },
    { width: 320, height: 740 },
    { width: 430, height: 932 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    if (size.width === 393) {
      await page.screenshot({
        path: "artifacts/screenshots/forma-iphone-preview.png",
      });
    }
    await page.screenshot({
      path: `artifacts/screenshots/home-${size.width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await nav(page, "Train");
  await expect(
    page.getByRole("heading", { name: "Let’s train." }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/train-mobile.png",
    fullPage: true,
  });
  await nav(page, "Plan");
  await expect(page.getByRole("heading", { name: "Your plan." })).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/plan-mobile.png",
    fullPage: true,
  });
  const navigation = await page.evaluate(() => ({
    usableMs: performance
      .getEntriesByType("navigation")
      .map(
        (e) => (e as PerformanceNavigationTiming).domContentLoadedEventEnd,
      )[0],
    resources: performance.getEntriesByType("resource").length,
  }));
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/performance.json",
    JSON.stringify(navigation, null, 2),
  );
});
