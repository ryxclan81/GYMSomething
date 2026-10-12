import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { formControl, choose, persisted, quickOnboard } from "./helpers";

async function nutrition(page: Page) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Nutrition", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nutrition", exact: true }),
  ).toBeVisible();
}

test("optional setup saves the complete profile, chosen environment and nutrition without adding history", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: "Welcome to Setwise" });
  await expect(welcome).toBeVisible();
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 852, height: 393 },
    { width: 393, height: 852 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      welcome.getByRole("button", { name: "Continue", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      welcome.getByRole("button", { name: "Use defaults", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      welcome.getByRole("button", { name: /^Skip for now/ }),
    ).toBeInViewport({ ratio: 1 });
  }
  await expect(formControl(welcome, "Bodyweight (lb), optional")).toBeVisible();
  await expect(
    welcome.getByRole("combobox", { name: "Experience" }),
  ).toBeVisible();
  await expect(welcome.locator("details")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("setup-basics.png") });
  await page.screenshot({
    path: "artifacts/screenshots/onboarding-basics.png",
  });
  expect(
    (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
  ).toEqual([]);
  await formControl(welcome, /What should we call you/).fill("Jamie");
  const focus = welcome.getByRole("combobox", { name: "Primary focus" });
  await focus.focus();
  await focus.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Hypertrophy", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Hybrid", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(focus).toContainText("Hybrid");
  await welcome.getByRole("button", { name: /^Pounds/ }).click();
  await choose(
    welcome.getByRole("combobox", { name: "Experience" }),
    "Intermediate",
  );
  await formControl(welcome, "Bodyweight (lb), optional").fill("180");
  await formControl(welcome, "Feet", { exact: true }).fill("5");
  const inches = formControl(welcome, "Inches", { exact: true });
  await inches.fill("");
  await expect(inches).toHaveValue("");
  await inches.fill("0");
  await expect(inches).toHaveValue("0");
  await welcome.getByRole("button", { name: /^Kilograms/ }).click();
  await expect(formControl(welcome, "Height (cm), optional")).toHaveValue(
    "152.4",
  );
  await formControl(welcome, "Height (cm), optional").fill("178");
  await welcome.getByRole("button", { name: /^Pounds/ }).click();
  await expect(formControl(welcome, "Feet", { exact: true })).toHaveValue("5");
  await expect(formControl(welcome, "Inches", { exact: true })).toHaveValue(
    "10.08",
  );
  await welcome.getByRole("button", { name: /^Kilograms/ }).click();
  await expect(formControl(welcome, "Height (cm), optional")).toHaveValue(
    "178",
  );
  await welcome.getByRole("button", { name: /^Pounds/ }).click();
  await formControl(welcome, "Secondary goals").fill("Strength, Cardio");
  await welcome.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    welcome.getByRole("heading", { name: "Find your rhythm." }),
  ).toBeVisible();
  await expect(welcome.locator(".setup-body")).toHaveJSProperty("scrollTop", 0);
  await expect(
    welcome.getByRole("button", { name: "Continue", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  const minutes = formControl(welcome, "Preferred session length (minutes)");
  await minutes.fill("");
  await expect(minutes).toHaveValue("");
  await minutes.fill("35");
  await welcome.getByRole("button", { name: "Tuesday", exact: true }).click();
  await expect(welcome.locator("details")).toHaveCount(0);
  await choose(
    welcome.getByRole("combobox", { name: "Preferred split" }),
    "Hybrid",
  );
  await choose(
    welcome.getByRole("combobox", { name: "Effort tracking" }),
    "both",
  );
  await formControl(welcome, "Default rest (seconds)").fill("75");
  await formControl(welcome, "Default minimum reps").fill("6");
  await formControl(welcome, "Default maximum reps").fill("10");
  await formControl(welcome, "Training limitations (optional)").fill(
    "Prefer shorter sessions",
  );
  await formControl(welcome, "Exercises to avoid (optional)").fill("Pushups");
  await welcome.getByRole("button", { name: "Continue", exact: true }).click();

  await welcome.getByRole("button", { name: /^Home Essentials/ }).click();
  await expect(welcome.locator("details")).toHaveCount(0);
  await formControl(
    welcome,
    "Maximum dumbbell weight (lb each), optional",
  ).fill("50");
  await formControl(welcome, "Bench can incline").check();
  await formControl(welcome, "Equipment notes (optional)").fill(
    "Adjustable pair",
  );
  await welcome.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    welcome.getByRole("heading", { name: "A place for nutrition." }),
  ).toBeVisible();
  await expect(
    formControl(welcome, "Enable nutrition", { exact: true }),
  ).not.toBeChecked();
  await formControl(welcome, "Enable nutrition", { exact: true }).check();
  await expect(formControl(welcome, "Enable ai assistant")).not.toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath("setup-optional-tools.png"),
  });
  await welcome.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(welcome.locator(".setup-review")).toContainText("Nutrition");
  await formControl(welcome, "Create an editable starter plan").uncheck();
  await welcome.getByRole("button", { name: "Let’s get started" }).click();
  await expect(welcome).not.toBeVisible();

  const data = await persisted(page);
  expect(data.profile).toMatchObject({
    name: "Jamie",
    focus: "Hybrid",
    unit: "lb",
    experience: "Intermediate",
    duration: 35,
    days: [1, 4, 5],
    split: "Hybrid",
    effort: "both",
    restSeconds: 75,
    heightCm: 178,
    nutrition: true,
    voice: false,
    ai: false,
    spotify: false,
    limitations: "Prefer shorter sessions",
    secondaryGoals: ["Strength", "Cardio"],
    onboardingComplete: true,
  });
  expect(data.profile.bodyweightKg).toBeCloseTo(81.6466, 3);
  expect(data.profile.avoid).toEqual([
    data.exercises.find((ex) => ex.name === "Pushups")!.id,
  ]);
  expect(data.profile.progression).toMatchObject({ repMin: 6, repMax: 10 });
  expect(data.activeEquipmentId).toBe("eq-home");
  expect(data.equipment.find((e) => e.id === "eq-home")).toMatchObject({
    canIncline: true,
    notes: "Adjustable pair",
  });
  expect(
    data.equipment.find((e) => e.id === "eq-home")!.maxDumbbellKg,
  ).toBeCloseTo(22.6796, 3);
  expect(data.schedule).toHaveLength(0);
  expect(data.sessions).toHaveLength(0);
  await page.reload();
  await expect(welcome).not.toBeVisible();
  await nutrition(page);
  await expect(page.getByRole("heading", { name: "Food diary" })).toBeVisible();
});

test("nutrition is discoverable while off, numeric values can be replaced and disabling preserves the diary", async ({
  page,
}, testInfo) => {
  await quickOnboard(page, { name: "Morgan", unit: "kg" });
  expect((await persisted(page)).profile.nutrition).toBe(false);
  await nutrition(page);
  await expect(
    page.getByRole("heading", { name: "Nutrition, when you want it." }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("nutrition-discovery.png"),
  });
  await page.screenshot({
    path: "artifacts/screenshots/nutrition-discovery.png",
  });
  await page
    .getByRole("button", { name: "Enable nutrition", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Food diary" })).toBeVisible();
  await page
    .getByRole("button", { name: "Create custom food", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Create custom food" });
  await formControl(editor, "Food name").fill("Everyday oats");
  const portion = formControl(editor, "Reference portion (grams)");
  await portion.fill("");
  await expect(portion).toHaveValue("");
  await portion.fill("40");
  const energy = formControl(editor, "Calories (kcal)", { exact: true });
  await energy.fill("");
  await expect(energy).toHaveValue("");
  await energy.fill("150");
  await formControl(editor, "Protein (g)", { exact: true }).fill("5");
  await formControl(editor, "Carbohydrate (g)", { exact: true }).fill("27");
  await formControl(editor, "Fat (g)", { exact: true }).fill("3");
  await editor.getByRole("button", { name: "Save food" }).click();
  const logging = page.getByRole("dialog", { name: "Log food", exact: true });
  await choose(
    logging.getByRole("combobox", { name: "Meal", exact: true }),
    "Lunch",
  );
  await formControl(logging, "Portions", { exact: true }).fill("2");
  await logging.getByRole("button", { name: "Add to diary" }).click();
  await expect(logging).not.toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Adjust total" }).click();
  const water = formControl(page, "Total water (ml)");
  await water.fill("");
  await expect(water).toHaveValue("");
  await water.fill("1250");
  await water.blur();
  await expect
    .poll(async () => Object.values((await persisted(page)).water))
    .toContain(1250);
  expect((await persisted(page)).diary[0]).toMatchObject({
    meal: "Lunch",
    servings: 2,
    food: { name: "Everyday oats", calories: 150, servingGrams: 40 },
  });
  await page.screenshot({
    path: testInfo.outputPath("nutrition-mobile.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: "artifacts/screenshots/nutrition-mobile.png",
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).include(".nutrition-page").analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: testInfo.outputPath("nutrition-desktop.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: "artifacts/screenshots/nutrition-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /^Nutrition/ }).uncheck();
  await expect
    .poll(async () => (await persisted(page)).profile.nutrition)
    .toBe(false);
  expect((await persisted(page)).diary).toHaveLength(1);
  await page.reload();
  await nutrition(page);
  await page
    .getByRole("button", { name: "Enable nutrition", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Everyday oats/ }),
  ).toBeVisible();
  expect((await persisted(page)).diary[0].servings).toBe(2);
  expect(Object.values((await persisted(page)).water)).toContain(1250);
});

test("height edits in Settings preserve centimeters across unit switches and reloads", async ({
  page,
}) => {
  await quickOnboard(page, { name: "Casey", unit: "kg" });
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  const profile = page.getByRole("dialog", { name: "Training profile" });
  await choose(
    profile.getByRole("combobox", { name: "Measurement units" }),
    "lb",
  );
  const feet = formControl(profile, "Feet", { exact: true });
  const inches = formControl(profile, "Inches", { exact: true });
  await feet.fill("6");
  await inches.fill("");
  await expect(inches).toHaveValue("");
  await inches.fill("0");
  await profile.getByRole("button", { name: "Save preferences" }).click();
  await expect(profile).not.toBeVisible();
  expect((await persisted(page)).profile.heightCm).toBe(182.88);
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(feet).toHaveValue("6");
  await expect(inches).toHaveValue("0");
  await choose(
    profile.getByRole("combobox", { name: "Measurement units" }),
    "kg",
  );
  const metric = formControl(profile, "Height (cm), optional");
  await expect(metric).toHaveValue("182.88");
  await metric.fill("180");
  await choose(
    profile.getByRole("combobox", { name: "Measurement units" }),
    "lb",
  );
  await expect(feet).toHaveValue("5");
  await expect(inches).toHaveValue("10.87");
  await profile.getByRole("button", { name: "Save preferences" }).click();
  await expect(profile).not.toBeVisible();
  expect((await persisted(page)).profile.heightCm).toBe(180);
  await page.reload();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(feet).toHaveValue("5");
  await expect(inches).toHaveValue("10.87");
  await feet.fill("");
  await inches.fill("");
  await profile.getByRole("button", { name: "Save preferences" }).click();
  await expect(profile).not.toBeVisible();
  expect((await persisted(page)).profile.heightCm).toBeUndefined();
});
