import { test, expect, type Page } from "@playwright/test";
import { createSession } from "../../src/domain/session";
import { formControl, persisted, quickOnboard, writeData } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

async function openNutrition(page: Page) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Nutrition", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nutrition", exact: true }),
  ).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Enable nutrition", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Enable nutrition", exact: true })
      .click();
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  return page.getByRole("dialog", { name: "Find food", exact: true });
}

test("hold timing survives pause/reload, excludes paused time and records actual duration", async ({
  page,
}) => {
  await page.clock.install();
  await quickOnboard(page);
  const data = await persisted(page);
  const template = structuredClone(
    data.templates.find((template) => template.id === "tpl-full-a")!,
  );
  const plank = template.exercises.find(
    (p) =>
      data.exercises.find((exercise) => exercise.id === p.exerciseId)?.name ===
      "Plank",
  )!;
  plank.sets = 2;
  plank.durationSeconds = 30;
  template.exercises = [plank];
  data.activeSession = createSession(data, template);
  data.activeSession.focusedExerciseId = data.activeSession.exercises[0].id;
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await page
    .getByRole("button", { name: "Start Plank set 1 timer", exact: true })
    .click();
  await persisted(page);
  await page.clock.fastForward(4200);
  await page
    .getByRole("button", { name: "Pause Plank set 1 timer", exact: true })
    .click();
  const paused = await persisted(page);
  expect(paused.activeSession!.setTimer!.elapsedMs).toBeGreaterThanOrEqual(
    4200,
  );
  expect(paused.activeSession!.setTimer!.startedAt).toBeUndefined();
  await page.reload();
  await page.locator(".resume-banner").click();
  await page.clock.fastForward(30000);
  expect((await persisted(page)).activeSession!.setTimer!.elapsedMs).toBe(
    paused.activeSession!.setTimer!.elapsedMs,
  );
  await page
    .getByRole("button", { name: "Resume Plank set 1 timer", exact: true })
    .click();
  await persisted(page);
  await page.clock.fastForward(3100);
  await page
    .getByRole("button", { name: "Finish Plank set 1 timer", exact: true })
    .click();
  let saved = (await persisted(page)).activeSession!;
  expect(saved.exercises[0].sets[0]).toMatchObject({
    completed: true,
    type: "timed",
  });
  expect(saved.exercises[0].sets[0].durationSeconds).toBeGreaterThanOrEqual(
    7.3,
  );
  expect(saved.exercises[0].sets[0].durationSeconds).toBeLessThan(10);
  expect(saved.setTimer).toBeUndefined();
  await page
    .getByRole("button", { name: "Start Plank set 2 timer", exact: true })
    .click();
  await persisted(page);
  await page.clock.fastForward(1500);
  await page
    .getByRole("button", { name: "Reset Plank set 2 timer", exact: true })
    .click();
  saved = (await persisted(page)).activeSession!;
  expect(saved.setTimer).toBeUndefined();
  await formControl(page, "Plank set 2 duration in seconds", {
    exact: true,
  }).fill("15");
  await page
    .getByRole("button", { name: "Complete Plank set 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "All exercises", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  const completed = await persisted(page);
  expect(completed.activeSession).toBeNull();
  expect(completed.sessions.at(-1)!.setTimer).toBeUndefined();
  expect(completed.sessions.at(-1)!.exercises[0].sets[0].durationSeconds).toBe(
    saved.exercises[0].sets[0].durationSeconds,
  );
});

test("unknown packaged barcode can be entered from its label and reused offline through UPC padding", async ({
  page,
  context,
}) => {
  let requests = 0;
  await page.route("**/api/v3.6/product/**", (route) => {
    requests++;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "failure" }),
    });
  });
  await quickOnboard(page);
  let search = await openNutrition(page);
  await formControl(search, "Barcode or supported product URL", {
    exact: true,
  }).fill("012345000058");
  await search.getByRole("button", { name: "Look up", exact: true }).click();
  await search
    .getByRole("button", {
      name: "Save this barcode from its label",
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Create custom food",
    exact: true,
  });
  await expect(formControl(editor, "Protein (g)", { exact: true })).toHaveValue(
    "",
  );
  await formControl(editor, "Food name", { exact: true }).fill(
    "My package snack",
  );
  await formControl(editor, "Reference portion (grams)", { exact: true }).fill(
    "40",
  );
  await formControl(editor, "Calories (kcal)", { exact: true }).fill("160");
  await formControl(editor, "Protein (g)", { exact: true }).fill("4");
  await formControl(editor, "Carbohydrate (g)", { exact: true }).fill("20");
  await formControl(editor, "Fat (g)", { exact: true }).fill("7");
  await editor.getByRole("button", { name: "Save food", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Log food", exact: true })
    .getByRole("button", { name: "Add to diary", exact: true })
    .click();
  const saved = await persisted(page);
  expect(
    saved.foods.find((food) => food.name === "My package snack")!.barcode,
  ).toBe("0012345000058");
  expect(saved.diary.at(-1)!.food).toMatchObject({
    calories: 160,
    servingGrams: 40,
    protein: 4,
    carbs: 20,
    fat: 7,
  });
  expect(saved.diary.at(-1)!.food.fiber).toBeUndefined();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  search = page.getByRole("dialog", { name: "Find food", exact: true });
  await formControl(search, "Barcode or supported product URL", {
    exact: true,
  }).fill("00012345000058");
  await search.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Log food", exact: true }),
  ).toContainText("My package snack");
  expect(requests).toBe(1);
});

test("generic foods are discoverable offline and persist only the selected item and diary snapshot", async ({
  page,
  context,
}) => {
  await quickOnboard(page);
  const before = await persisted(page);
  expect(before.foods).toHaveLength(0);
  const search = await openNutrition(page);
  await context.setOffline(true);
  await formControl(search, "Search your collection", { exact: true }).fill(
    "Bananas, raw",
  );
  const row = search
    .locator(".list-row")
    .filter({ hasText: "Bananas, raw" })
    .first();
  await expect(row).toContainText("USDA generic food");
  expect(
    (await new AxeBuilder({ page }).include("dialog[open]").analyze())
      .violations,
  ).toEqual([]);
  await row.locator("button").first().click();
  const portion = page.getByRole("dialog", { name: "Log food", exact: true });
  await expect(portion).toContainText("USDA");
  await portion
    .getByRole("button", { name: "Add to diary", exact: true })
    .click();
  const after = await persisted(page);
  expect(after.foods).toHaveLength(1);
  expect(after.foods[0].id).toMatch(/^usda-sr-/);
  expect(after.foods[0].barcode).toBeUndefined();
  expect(after.diary[0].food).toEqual(after.foods[0]);
  expect(after.diary[0].foodId).toBe(after.foods[0].id);
});

test("newer v3 normalized nutrition logs complete package values without legacy nutriments or optional fiber", async ({
  page,
}) => {
  const barcode = "3017620422003";
  await page.route("**/api/v3.6/product/**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("fields")).toContain("nutrition");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        product: {
          code: barcode,
          product_name: "QA package snack",
          brands: "Fixture brand",
          nutrition: {
            aggregated_set: {
              per: "100g",
              preparation: "as_sold",
              nutrients: {
                "energy-kcal": {
                  value: 160,
                  unit: "kcal",
                  source: "manufacturer",
                },
                proteins: { value: 4, unit: "g", source: "manufacturer" },
                "carbohydrates-total": {
                  value: 20,
                  unit: "g",
                  source: "manufacturer",
                },
                fat: { value: 7, unit: "g", source: "manufacturer" },
              },
            },
          },
        },
      }),
    });
  });
  await quickOnboard(page);
  const search = await openNutrition(page);
  await formControl(search, "Barcode or supported product URL", {
    exact: true,
  }).fill(barcode);
  await search.getByRole("button", { name: "Look up", exact: true }).click();
  const portion = page.getByRole("dialog", { name: "Log food", exact: true });
  await expect(portion).toContainText("QA package snack");
  await expect(portion).toContainText("Open Food Facts");
  await portion
    .getByRole("button", { name: "Add to diary", exact: true })
    .click();
  const saved = await persisted(page);
  expect(saved.diary[0].food).toMatchObject({
    barcode,
    servingGrams: 100,
    calories: 160,
    protein: 4,
    carbs: 20,
    fat: 7,
  });
  expect(saved.diary[0].food.fiber).toBeUndefined();
  expect(saved.foods.find((food) => food.id === `off:${barcode}`)).toBeTruthy();
});

test("a running countdown survives reload and target expiry never completes a set", async ({
  page,
}) => {
  await page.clock.install();
  await quickOnboard(page);
  const data = await persisted(page);
  const template = structuredClone(
    data.templates.find((entry) => entry.id === "tpl-bodyweight")!,
  );
  const hold = template.exercises.find(
    (entry) =>
      data.exercises.find((exercise) => exercise.id === entry.exerciseId)
        ?.name === "Plank",
  )!;
  hold.durationSeconds = 5;
  hold.sets = 1;
  template.exercises = [hold];
  data.activeSession = createSession(data, template);
  data.activeSession.focusedExerciseId = data.activeSession.exercises[0].id;
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await page
    .getByRole("button", { name: "Start Plank set 1 timer", exact: true })
    .click();
  const startedAt = (await persisted(page)).activeSession!.setTimer!.startedAt;
  await page.clock.fastForward(6000);
  await expect(page.getByText("Beyond target", { exact: true })).toBeVisible();
  expect(
    (await persisted(page)).activeSession!.exercises[0].sets[0].completed,
  ).toBe(false);
  await page.reload();
  await page.clock.fastForward(2000);
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("button", { name: "Pause Plank set 1 timer", exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).activeSession!.setTimer!.startedAt).toBe(
    startedAt,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Finish Plank set 1 timer", exact: true })
    .click();
  const completed = (await persisted(page)).activeSession!.exercises[0].sets[0];
  expect(completed.completed).toBe(true);
  expect(completed.durationSeconds).toBeGreaterThanOrEqual(8);
  expect(completed.durationSeconds).toBeLessThan(15);
});

test("online food search can fetch another provider page and reveal the additional products", async ({
  page,
}) => {
  await page.clock.install();
  const requestedPages: string[] = [];
  await page.route("**/cgi/search.pl**", async (route) => {
    const url = new URL(route.request().url());
    const requestedPage = url.searchParams.get("page")!;
    requestedPages.push(requestedPage);
    expect(url.searchParams.get("page_size")).toBe("50");
    const index = requestedPage === "1" ? 1 : 51;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        count: 51,
        products: Array.from(
          { length: requestedPage === "1" ? 50 : 1 },
          (_, offset) => ({
            code: String(1000000000000 + index + offset),
            product_name: `Fixturebar ${index + offset}`,
            nutriments: {
              "energy-kcal_100g": 140,
              proteins_100g: 3,
              carbohydrates_100g: 20,
              fat_100g: 6,
            },
          }),
        ),
      }),
    });
  });
  await quickOnboard(page);
  const search = await openNutrition(page);
  await formControl(search, "Search your collection", { exact: true }).fill(
    "Fixturebar",
  );
  await search
    .getByRole("button", { name: "Search Open Food Facts", exact: true })
    .click();
  await expect(search.locator(".list-row")).toHaveCount(40);
  await expect(
    search.getByRole("button", { name: "Load more products", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(7000);
  await search
    .getByRole("button", { name: "Load more products", exact: true })
    .click();
  await expect(
    search.getByRole("button", { name: "Load more products", exact: true }),
  ).toHaveCount(0);
  await search.getByRole("button", { name: "Next foods", exact: true }).click();
  await expect(search.locator(".list-row")).toHaveCount(11);
  await expect(search.locator(".list-row").last()).toContainText(
    "Fixturebar 51",
  );
  expect(requestedPages).toEqual(["1", "2"]);
  expect((await persisted(page)).foods).toHaveLength(51);
});
