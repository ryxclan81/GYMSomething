import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  quickOnboard,
  persisted,
  writeData,
  formControl,
  choose,
} from "./helpers";

test("a first visit shows the welcome screen and setup resumes after reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make your next set count." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 393, height: 852 },
    { width: 852, height: 393 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .getByRole("button", { name: "Get started", exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.screenshot({
    path: "artifacts/screenshots/setwise-welcome.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Welcome to Setwise" }),
  ).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-saving",
    "false",
  );
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Welcome to Setwise" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get started", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Use defaults", exact: true }).click();
  await page
    .getByRole("button", { name: "Let’s get started", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
});

test("the logo goes home and mobile scrolling clears the bottom navigation", async ({
  page,
}) => {
  await quickOnboard(page);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  const header = page.locator(".app-header");
  await expect(header.locator("button:visible")).toHaveCount(3);
  await header
    .getByRole("button", { name: "Setwise home", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 393, height: 852 },
    { width: 740, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator(".app-content").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const summary = await page.locator(".week-summary").boundingBox();
    const nav = await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .boundingBox();
    expect(summary).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(summary!.y + summary!.height).toBeLessThanOrEqual(nav!.y - 16);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.locator(".app-content").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.screenshot({
    path: "artifacts/screenshots/setwise-week-clearance.png",
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("a home calisthenics workout can skip an unavailable movement and starts in the overview", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  data.activeEquipmentId = "eq-home";
  data.profile.focus = "Calisthenics";
  data.profile.avoid = data.exercises.map((entry) => entry.id);
  const date = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  data.schedule = [
    {
      id: "home-calisthenics",
      date,
      templateId: "tpl-bodyweight",
      status: "planned",
    },
  ];
  await writeData(page, data);
  await page
    .getByRole("button", { name: "Start Bodyweight Foundation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Make this workout yours" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "You can skip this exercise and continue the workout.",
  );
  await choose(
    formControl(dialog, "Pullups", { exact: true }),
    "Skip this exercise for this workout",
    true,
  );
  await dialog
    .getByRole("button", { name: "Start adapted workout", exact: true })
    .click();
  await expect(page.locator(".workout-overview-card")).toHaveCount(4);
  const active = (await persisted(page)).activeSession!;
  expect(
    active.exercises
      .find((entry) => entry.exercise.name === "Pullups")!
      .sets.every((set) => set.skipped),
  ).toBe(true);
  expect(
    active.exercises
      .find((entry) => entry.exercise.name === "Pushups")!
      .sets.every((set) => !set.skipped && !set.completed),
  ).toBe(true);
  await page.getByRole("button", { name: "Open Pushups", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/focus-mode/);
  await expect(
    page.getByRole("heading", { name: "Pushups", exact: true }),
  ).toBeVisible();
});

test("common bodyweight movements can be found with spelling mistakes", async ({
  page,
}) => {
  await quickOnboard(page);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Workouts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Exercise library", exact: true })
    .click();
  const search = formControl(page, "Search exercises", { exact: true });
  await search.fill("psuh");
  await expect(page.locator(".exercise-info").first()).toContainText("Pushups");
  await search.fill("situps");
  await expect(page.locator(".exercise-info").first()).toContainText("Sit-Up");
  await search.fill("sutups");
  await expect(page.locator(".exercise-info").first()).toContainText("Sit-Up");
});
