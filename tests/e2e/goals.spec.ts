import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  formControl,
  choose,
  persisted,
  quickOnboard,
  writeData,
} from "./helpers";
test.use({ timezoneId: "America/New_York" });
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("the first recorded goal achievement displays the correct local calendar date", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  data.goals.push({
    id: "achievement-date",
    name: "Recorded milestone",
    type: "custom",
    start: 0,
    current: 10,
    target: 10,
    unit: "points",
    notes: "",
    history: [{ date: "2026-10-11T12:00:00.000Z", value: 10 }],
  });
  await writeData(page, data);
  await nav(page, "Progress");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page
    .locator(".goal-row")
    .filter({ hasText: "Recorded milestone" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Recorded milestone" }),
  ).toContainText("First reached in goal history: October 11, 2026");
});
test("weight goals estimate from current weight, support editable duration and preserve manual dates after reload", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  data.profile.bodyweightKg = 80;
  await writeData(page, data);
  await nav(page, "Progress");
  await page
    .getByRole("button", { name: "Create a goal", exact: true })
    .click();
  let editor = page.getByRole("dialog", { name: "Set a goal" });
  await formControl(editor, "Goal name").fill("My weight goal");
  await choose(formControl(editor, "Goal type"), "bodyweight");
  await formControl(editor, "Target value").fill("70");
  await formControl(editor, "Plan from date").fill("2026-10-11");
  await expect(
    formControl(editor, "Current weight for estimate (kg)"),
  ).toHaveValue("80");
  await expect(
    editor.getByText("About 20 weeks", { exact: true }),
  ).toBeVisible();
  await expect(formControl(editor, "Deadline (optional)")).toHaveValue(
    "2027-02-28",
  );
  await formControl(editor, "Planning weeks").fill("10");
  await expect(
    formControl(editor, "Weekly weight change (kg/week)"),
  ).toHaveValue("1");
  await expect(formControl(editor, "Deadline (optional)")).toHaveValue(
    "2026-12-20",
  );
  await formControl(editor, "Deadline (optional)").fill("2027-04-01");
  await formControl(editor, "Target value").fill("72");
  await expect(formControl(editor, "Deadline (optional)")).toHaveValue(
    "2027-04-01",
  );
  await page.screenshot({
    path: "artifacts/screenshots/goal-estimate-mobile.png",
  });
  expect(
    (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
  ).toEqual([]);
  await editor.getByRole("button", { name: "Save goal", exact: true }).click();
  await expect(editor).not.toBeVisible();
  let saved = (await persisted(page)).goals.find(
    (goal) => goal.name === "My weight goal",
  )!;
  expect(saved.timeline).toMatchObject({
    baseline: 80,
    mode: "weeks",
    weeks: 10,
    deadlineMode: "manual",
  });
  expect(saved.deadline).toBe("2027-04-01");
  await page.reload();
  await nav(page, "Progress");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.locator(".goal-row").filter({ hasText: "My weight goal" }).click();
  await page.getByRole("button", { name: "Edit goal", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Edit goal" });
  await expect(formControl(editor, "Deadline (optional)")).toHaveValue(
    "2027-04-01",
  );
  await choose(
    editor.getByRole("combobox", { name: "Unit", exact: true }),
    "lb",
  );
  await expect(
    editor.getByText("About 10 weeks", { exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Use estimated date", exact: true })
    .click();
  await expect(formControl(editor, "Deadline (optional)")).toHaveValue(
    "2026-12-20",
  );
  await editor.getByRole("button", { name: "Save goal", exact: true }).click();
  await expect(editor).not.toBeVisible();
  saved = (await persisted(page)).goals.find(
    (goal) => goal.name === "My weight goal",
  )!;
  expect(saved.unit).toBe("lb");
  expect(saved.timeline!.baseline).toBeCloseTo(176.3698, 3);
  expect(saved.timeline!.weeks).toBeCloseTo(10);
  expect(saved.deadline).toBe("2026-12-20");
});

test("appearance preferences save and exactly one Settings action is visible on desktop and phone", async ({
  page,
}) => {
  await quickOnboard(page);
  for (const width of [1440, 393]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(1);
    expect(
      (await page
        .getByRole("button", { name: "Settings", exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Appearance Accent color/ }).click();
  const editor = page.getByRole("dialog", { name: "Appearance", exact: true });
  await choose(formControl(editor, "Accent color"), "violet");
  await choose(formControl(editor, "Spacing"), "compact");
  expect((await persisted(page)).profile).toMatchObject({
    accent: "violet",
    density: "compact",
  });
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
});
