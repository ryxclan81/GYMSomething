import { test, expect, type Locator, type Page } from "@playwright/test";
import { quickOnboard, formControl } from "./helpers";

async function touchSwipe(
  page: Page,
  target: Locator,
  direction: "left" | "right",
) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const start = box.x + box.width * (direction === "left" ? 0.8 : 0.2);
  const end = box.x + box.width * (direction === "left" ? 0.2 : 0.8);
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start, y }],
  });
  for (let i = 1; i <= 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start + ((end - start) * i) / 8, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

test.describe("mobile navigation and calendars", () => {
  test.use({ hasTouch: true });
  test("selected navigation has a clear label, and both calendars accept touch swipes", async ({
    page,
  }) => {
    await quickOnboard(page);
    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    const home = navigation.getByRole("button", { name: "Home", exact: true });
    await expect(home).toHaveAttribute("aria-current", "page");
    const styles = await home.evaluate((button) => ({
      background: getComputedStyle(button).backgroundColor,
      underline: getComputedStyle(button.querySelector("span")!)
        .textDecorationLine,
    }));
    expect(styles.background).toBe("rgba(0, 0, 0, 0)");
    expect(styles.underline).toContain("underline");
    const dates = page.locator(".home-day-picker button");
    const first = await dates.first().getAttribute("aria-label");
    await touchSwipe(page, page.locator(".home-day-picker"), "left");
    await expect(dates.first()).not.toHaveAttribute("aria-label", first!);
    await touchSwipe(page, page.locator(".home-day-picker"), "right");
    await expect(dates.first()).toHaveAttribute("aria-label", first!);
    await navigation.getByRole("button", { name: "Plan", exact: true }).tap();
    const week = page.locator(".week-strip");
    const planFirst = await week
      .getByRole("button")
      .first()
      .getAttribute("aria-label");
    await touchSwipe(page, week, "left");
    await expect(week.getByRole("button").first()).not.toHaveAttribute(
      "aria-label",
      planFirst!,
    );
    await page
      .getByRole("button", { name: "Previous week", exact: true })
      .tap();
    await expect(week.getByRole("button").first()).toHaveAttribute(
      "aria-label",
      planFirst!,
    );
    await expect(page.getByRole("dialog", { name: /^Plan / })).toHaveCount(0);
    const tabs = page.locator(".plan-page .segmented-control");
    await tabs.getByRole("button", { name: "Workouts", exact: true }).tap();
    await expect(week).toHaveCount(0);
    await tabs.getByRole("button", { name: "Week", exact: true }).tap();
    await expect(week).toBeVisible();
    await touchSwipe(page, week, "right");
    await expect(week.getByRole("button").first()).not.toHaveAttribute(
      "aria-label",
      planFirst!,
    );
    await expect(page.getByRole("dialog", { name: /^Plan / })).toHaveCount(0);
    await week.getByRole("button").first().tap();
    await expect(page.getByRole("dialog", { name: /^Plan / })).toBeVisible();
  });
});

test("desktop navigation omits the dot and Manage equipment opens inventories directly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await quickOnboard(page);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("button", { name: "Home", exact: true }),
  ).toHaveClass("selected");
  await expect(page.locator(".nav-dot")).toHaveCount(0);
  const gear = page.locator(".app-header .equipment-selector");
  expect(await gear.innerText()).toBe("");
  expect((await gear.boundingBox())!.width).toBe(44);
  await gear.click();
  await page
    .getByRole("button", { name: "Manage equipment", exact: true })
    .click();
  const environments = page.getByRole("dialog", {
    name: "Equipment environments",
    exact: true,
  });
  await expect(environments).toBeVisible();
  const edit = environments
    .getByRole("button", { name: "Edit", exact: true })
    .first();
  expect(
    await edit.evaluate((button) => getComputedStyle(button).justifyContent),
  ).toBe("center");
  const padding = await edit.evaluate(
    (button) => getComputedStyle(button).paddingLeft,
  );
  expect(parseFloat(padding)).toBeGreaterThanOrEqual(12);
});

test("help icons stay quiet on hover and dropdown options explain their own choices", async ({
  page,
}) => {
  await page.clock.install();
  await quickOnboard(page);
  await page
    .locator(".app-header")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const help = page.getByRole("button", {
    name: "About Settings",
    exact: true,
  });
  await help.hover();
  await page.clock.fastForward(1200);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await help.click();
  await expect(
    page.getByRole("dialog", { name: "About Settings", exact: true }),
  ).toContainText("equipment inventories");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Explain controls|Exit help/i }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const profile = page.getByRole("dialog", {
    name: "Training profile",
    exact: true,
  });
  await formControl(profile, "Effort tracking", { exact: true }).click();
  const rpe = page.getByRole("option", { name: "RPE", exact: true });
  await rpe.hover();
  await page.clock.fastForward(700);
  await expect(page.getByRole("tooltip")).toContainText("0–10 effort rating");
  await expect(page.getByRole("tooltip")).not.toContainText("how many more");
  await rpe.click();
  await expect(
    formControl(profile, "Effort tracking", { exact: true }),
  ).toHaveText("RPE");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(profile).toBeVisible();
  await formControl(profile, "Strategy", { exact: true }).click();
  const duration = page.getByRole("option", { name: "Duration", exact: true });
  await page.mouse.move(4, 4);
  await page.keyboard.press("Tab");
  await page.keyboard.press("End");
  await page.clock.fastForward(1);
  await expect(
    page.getByRole("option", { name: "Distance", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.clock.fastForward(1);
  await expect(duration).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText(
    "longer future time target",
  );
  await expect(page.getByRole("tooltip")).not.toContainText(
    "shortest estimated",
  );
  await duration.press("Enter");
});
