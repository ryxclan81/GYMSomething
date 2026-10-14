import { test, expect } from "@playwright/test";
import { dateKey } from "../../src/domain/helpers";
import { createSession } from "../../src/domain/session";
import { formControl, persisted, quickOnboard, writeData } from "./helpers";

test("finishing the last set returns to exercise selection without losing rest or logged work", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const template = structuredClone(
    data.templates.find((item) => item.id === "tpl-full-a")!,
  );
  template.exercises[0].sets = 3;
  template.exercises[0].restSeconds = 120;
  data.activeSession = createSession(data, template);
  const [first, , available] = data.activeSession.exercises;
  first.sets[2].skipped = true;
  data.activeSession.focusedExerciseId = first.id;
  await writeData(page, data);
  await page.locator(".resume-banner").click();

  await formControl(page, `${first.exercise.name} set 1 reps`, {
    exact: true,
  }).fill("0");
  await page
    .getByRole("button", {
      name: `Complete ${first.exercise.name} set 1`,
      exact: true,
    })
    .click();
  await expect(page.locator(".workout-focused")).toBeVisible();
  expect((await persisted(page)).activeSession!.focusedExerciseId).toBe(
    first.id,
  );

  for (const index of [1, 2]) {
    await formControl(page, `${first.exercise.name} set ${index} reps`, {
      exact: true,
    }).fill("8");
    await page
      .getByRole("button", {
        name: `Complete ${first.exercise.name} set ${index}`,
        exact: true,
      })
      .click();
    if (index === 1)
      await expect(page.locator(".workout-focused")).toBeVisible();
  }
  await expect(page.locator(".workout-overview-card")).toHaveCount(4);
  await expect(page.locator(".app-shell")).not.toHaveClass(/focus-mode/);
  await expect(page.locator(".rest-dock")).toBeVisible();
  const saved = (await persisted(page)).activeSession!;
  expect(saved.focusedExerciseId).toBeUndefined();
  expect(
    saved.exercises[0].sets.slice(0, 2).every((set) => set.completed),
  ).toBe(true);
  expect(saved.exercises[0].sets[2].skipped).toBe(true);
  expect(saved.restEndsAt).toBeGreaterThan(Date.now());
  await expect(
    page.getByRole("button", {
      name: `Open ${first.exercise.name}`,
      exact: true,
    }),
  ).toContainText("Complete");

  await page
    .getByRole("button", {
      name: `Open ${available.exercise.name}`,
      exact: true,
    })
    .click();
  expect((await persisted(page)).activeSession!.focusedExerciseId).toBe(
    available.id,
  );
  await page.reload();
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("heading", {
      name: available.exercise.name,
      exact: true,
    }),
  ).toBeVisible();
  expect((await persisted(page)).activeSession!.exercises[0].sets).toEqual(
    saved.exercises[0].sets,
  );
});

test("saving a workout returns to Today's selection and releases the next planned workout", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const firstTemplate = data.templates.find(
    (item) => item.id === "tpl-full-a",
  )!;
  const nextTemplate = data.templates.find((item) => item.id === "tpl-full-b")!;
  const day = dateKey();
  data.schedule = [
    {
      id: "completion-first",
      date: day,
      templateId: firstTemplate.id,
      status: "planned",
    },
    {
      id: "completion-next",
      date: day,
      templateId: nextTemplate.id,
      status: "planned",
    },
  ];
  data.activeSession = createSession(data, firstTemplate, "completion-first");
  const first = data.activeSession.exercises[0];
  first.sets[0].completed = true;
  first.sets[0].completedAt = new Date().toISOString();
  data.activeSession.focusedExerciseId = first.id;
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();

  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".toast")).toContainText("Workout saved");
  const saved = await persisted(page);
  expect(saved.activeSession).toBeNull();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.schedule[0].status).toBe("completed");
  expect(saved.schedule[1].status).toBe("planned");
  await expect(
    page.getByRole("button", {
      name: `Start ${nextTemplate.name}`,
      exact: true,
    }),
  ).toBeEnabled();

  await page
    .getByRole("button", { name: "Review saved workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work put in." }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Start ${nextTemplate.name}`, exact: true })
    .click();
  expect((await persisted(page)).activeSession!.scheduleId).toBe(
    "completion-next",
  );
  await expect(
    page.getByRole("heading", { name: nextTemplate.name, exact: true }),
  ).toBeVisible();
});
