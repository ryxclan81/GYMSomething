import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { quickOnboard, persisted, writeData } from "./helpers";
import { createSession } from "../../src/domain/session";

test("field help works in onboarding and Escape keeps the setup open", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Setwise · Your training journal");
  const welcome = page.getByRole("dialog", { name: "Welcome to Setwise" });
  await welcome
    .getByRole("button", {
      name: "Explain Bodyweight (lb), optional",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Bodyweight measurement", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Your recorded body mass/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Bodyweight measurement", { exact: true }),
  ).not.toBeVisible();
  await expect(welcome).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
  ).toEqual([]);
});

test.describe("phone touch help", () => {
  test.use({ hasTouch: true });
  test("touch help explains a switch without changing it, then normal toggles save", async ({
    page,
  }) => {
    await quickOnboard(page, { name: "Taylor" });
    await page
      .locator(".app-header")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    const nutrition = page.locator(".settings-tools input.toggle").first();
    await expect(nutrition).not.toBeChecked();
    await page
      .locator(".app-header")
      .getByRole("button", { name: "Explain controls", exact: true })
      .click();
    await nutrition.tap();
    await expect(
      page.getByText("Nutrition tracking", { exact: true }),
    ).toBeVisible();
    await expect(nutrition).not.toBeChecked();
    expect((await persisted(page)).profile.nutrition).toBe(false);
    await page
      .getByRole("button", { name: /Exit help/i })
      .last()
      .click();
    await nutrition.tap();
    await expect(nutrition).toBeChecked();
    expect((await persisted(page)).profile.nutrition).toBe(true);
    await page.reload();
    await page
      .locator(".app-header")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await expect(
      page.locator(".settings-tools input.toggle").first(),
    ).toBeChecked();
    await page.locator(".settings-tools").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "artifacts/screenshots/setwise-controls.png",
    });
  });
});

test("workout icons reflect actual muscles, and focused effort has beginner help", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const date = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  data.schedule = ["tpl-push", "tpl-pull", "tpl-legs"].map((templateId, i) => ({
    id: `muscle-${i}`,
    templateId,
    date,
    status: "planned" as const,
  }));
  await writeData(page, data);
  const icons = page.locator(".daily-workout-icon .workout-icon");
  await expect(icons).toHaveCount(3);
  const kinds = await icons.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-workout-kind")),
  );
  expect(new Set(kinds).size).toBe(3);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 852, height: 393 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(icons.first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.screenshot({
    path: "artifacts/screenshots/setwise-daily-workouts.png",
  });
  data.profile.effort = "rir";
  data.activeSession = createSession(
    data,
    data.templates.find((template) => template.id === "tpl-push")!,
    "muscle-0",
  );
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await page.locator(".workout-overview-card").first().click();
  await page.getByText("RIR", { exact: true }).click();
  await expect(
    page.getByText("Reps in reserve (RIR)", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/RIR 2 means about two more reps/)).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/setwise-effort-help.png",
  });
});

function luminance(rgb: string) {
  if (rgb.trim().startsWith("#")) {
    const hex = rgb.trim().slice(1);
    rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
  }
  const values = rgb
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((value) => Number(value) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

test("mouse and keyboard help describe controls without opening their screens", async ({ page }) => {
  await quickOnboard(page);
  const header = page.locator(".app-header");
  const settings = header.getByRole("button", { name: "Settings", exact: true });
  await settings.hover();
  await expect(page.getByRole("tooltip")).toContainText("Change your preferences");
  await expect(settings).toHaveAttribute("aria-describedby", /setwise-help/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await header.getByRole("button", { name: "Explain controls", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(settings).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Change your preferences");
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
});

test("checked controls keep visible contrast for every accent", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  data.profile.nutrition = true;
  for (const accent of ["steel", "violet", "neutral"] as const) {
    data.profile.accent = accent;
    await writeData(page, data);
    await page
      .locator(".app-header")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    const toggle = page.locator(".settings-tools input.toggle").first();
    const colors = await toggle.evaluate((input) => ({
      track: getComputedStyle(input, "::before").backgroundColor,
      thumb: getComputedStyle(input, "::after").backgroundColor,
      surface: getComputedStyle(document.documentElement).getPropertyValue(
        "--surface",
      ),
    }));
    const track = luminance(colors.track),
      thumb = luminance(colors.thumb),
      surface = luminance(colors.surface);
    expect(
      (Math.max(track, thumb) + 0.05) / (Math.min(track, thumb) + 0.05),
    ).toBeGreaterThanOrEqual(3);
    expect(
      (Math.max(track, surface) + 0.05) / (Math.min(track, surface) + 0.05),
    ).toBeGreaterThanOrEqual(3);
    expect(
      await toggle.evaluate((input) => input.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
  }
});
