import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Template } from "../../src/domain/types";
import { prescription } from "../../src/domain/helpers";
import { createSession, completeSession } from "../../src/domain/session";
import { circuitRoundStats, logCircuitRound } from "../../src/domain/circuit";
import { validateBackup } from "../../src/state/store";
import { sessionStats } from "../../src/domain/engine";
import { formControl, persisted, quickOnboard, writeData } from "./helpers";

test("a custom timed circuit accepts the 5 / 10 / 15 movements and saves its own time limit", async ({
  page,
}) => {
  await quickOnboard(page);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page
    .locator(".plan-page")
    .getByRole("button", { name: "Workouts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create workout", exact: true })
    .first()
    .click();
  const sheet = page.getByRole("dialog", {
    name: "Create workout",
    exact: true,
  });
  await formControl(sheet, "Workout name", { exact: true }).fill(
    "20 minute repeat",
  );
  await sheet
    .getByRole("button", { name: "Timed circuit", exact: true })
    .click();
  await formControl(sheet, "Circuit time limit (minutes)", {
    exact: true,
  }).fill("20");
  expect(
    await formControl(sheet, "Circuit time limit (minutes)", {
      exact: true,
    }).evaluate((element) => (element as HTMLInputElement).validity.valid),
  ).toBe(true);
  for (const [name, reps] of [
    ["Pullups", "5"],
    ["Pushups", "10"],
    ["Bodyweight Squat", "15"],
  ] as const) {
    await sheet
      .getByRole("button", { name: "Add movement", exact: true })
      .click();
    await formControl(sheet, "Search exercises", { exact: true }).fill(name);
    await sheet
      .getByRole("button", { name: `Add ${name}`, exact: true })
      .click();
    const card = sheet
      .locator(".prescription-editor")
      .filter({ hasText: name })
      .last();
    await card.locator(".text-button").click();
    await formControl(card, "Per-round reps", { exact: true }).fill(reps);
  }
  await sheet
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(sheet).not.toBeVisible();
  const saved = (await persisted(page)).templates.find(
    (item) => item.name === "20 minute repeat",
  )!;
  expect(saved.circuit).toEqual({ durationSeconds: 1200 });
  expect(
    saved.exercises.map((item) => [item.repMin, item.repMax, item.sets]),
  ).toEqual([
    [5, 5, 1],
    [10, 10, 1],
    [15, 15, 1],
  ]);
  expect(saved.minutes).toBe(20);
  await page.reload();
  expect(
    (await persisted(page)).templates.find((item) => item.id === saved.id)
      ?.circuit,
  ).toEqual(saved.circuit);
});

test("a running circuit survives offline reload and saves only confirmed full and partial rounds", async ({
  page,
  context,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const template: Template = {
    id: "e2e-circuit",
    name: "5 / 10 / 15 repeat",
    description: "",
    focus: "Calisthenics",
    minutes: 20,
    updatedAt: new Date().toISOString(),
    circuit: { durationSeconds: 1200 },
    exercises: ["ex-pullups", "ex-pushups", "ex-bodyweight-squat"].map(
      (id, index) => ({
        ...prescription(data.exercises.find((item) => item.id === id)!),
        sets: 1,
        repMin: [5, 10, 15][index],
        repMax: [5, 10, 15][index],
        restSeconds: 0,
      }),
    ),
  };
  data.templates.unshift(template);
  data.activeSession = createSession(data, template);
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("heading", { name: "Round 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start circuit timer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record remaining round", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Round 2", exact: true }),
  ).toBeVisible();
  await formControl(page, "Pullups actual reps", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Record Pullups for round 2", exact: true })
    .click();
  const before = (await persisted(page)).activeSession!;
  expect(sessionStats(before)).toMatchObject({ sets: 4, reps: 33 });
  expect(before.circuit?.startedAt).toEqual(expect.any(Number));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await context.setOffline(true);
  await page.reload();
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("button", { name: "Pause circuit timer", exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).activeSession!.exercises[0].sets[1].reps).toBe(
    3,
  );
  await page
    .getByRole("button", { name: "Pause circuit timer", exact: true })
    .click();
  const paused = (await persisted(page)).activeSession!.circuit!;
  expect(paused.startedAt).toBeUndefined();
  expect(paused.elapsedMs).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Resume circuit timer", exact: true })
    .click();
  expect((await persisted(page)).activeSession!.circuit?.startedAt).toEqual(
    expect.any(Number),
  );
  expect(
    (await new AxeBuilder({ page }).include(".workout-circuit").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: "artifacts/screenshots/timed-circuit-mobile.png",
  });
  await page
    .getByRole("button", { name: "Finish circuit", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  const saved = (await persisted(page)).sessions.find(
    (item) => item.templateId === template.id,
  )!;
  expect(saved.circuit?.startedAt).toBeUndefined();
  expect(sessionStats(saved)).toMatchObject({ sets: 4, reps: 33 });
  expect(saved.exercises[1].sets[1].completed).toBe(false);
  expect((await persisted(page)).activeSession).toBeNull();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  await context.setOffline(false);
});

test("circuit expiry never records a movement and an empty circuit cannot be saved", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const pushups = data.exercises.find((item) => item.id === "ex-pushups")!;
  const template: Template = {
    id: "empty-circuit",
    name: "Short circuit",
    description: "",
    focus: "Calisthenics",
    minutes: 1,
    updatedAt: new Date().toISOString(),
    circuit: { durationSeconds: 1 },
    exercises: [{ ...prescription(pushups), sets: 1 }],
  };
  data.templates.unshift(template);
  data.activeSession = createSession(data, template);
  data.activeSession.circuit!.startedAt = Date.now() - 5000;
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  await expect(
    page.getByText("Beyond time target", { exact: true }),
  ).toBeVisible();
  const active = (await persisted(page)).activeSession!;
  expect(sessionStats(active).sets).toBe(0);
  expect(active.circuit?.round).toBe(1);
  await page
    .getByRole("button", { name: "Finish circuit", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  expect((await persisted(page)).sessions).toHaveLength(0);
  expect((await persisted(page)).activeSession?.id).toBe(active.id);
});

test("saved circuit corrections guard adding or substituting movements and preserve partial-round accounting on reload", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  data.profile.voice = true;
  const template: Template = {
    id: "history-loop",
    name: "History loop",
    description: "",
    focus: "Calisthenics",
    minutes: 20,
    updatedAt: new Date().toISOString(),
    circuit: { durationSeconds: 1200 },
    exercises: ["ex-pullups", "ex-pushups", "ex-bodyweight-squat"].map(
      (id, index) => ({
        ...prescription(data.exercises.find((item) => item.id === id)!),
        sets: 1,
        repMin: [5, 10, 15][index],
        repMax: [5, 10, 15][index],
      }),
    ),
  };
  data.templates.unshift(template);
  const session = createSession(data, template);
  logCircuitRound(session);
  completeSession(data, session);
  const saved = data.sessions.at(-1)!;
  const originalIds = saved.exercises.map((entry) => [
    entry.id,
    entry.sets.map((set) => [set.id, set.circuitRound]),
  ]);
  await writeData(page, data);
  async function openHistory() {
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "Progress", exact: true })
      .click();
    await page
      .locator(".progress-page")
      .getByRole("button", { name: "History", exact: true })
      .click();
    await page
      .locator(".history-row")
      .filter({ hasText: "History loop" })
      .click();
    await page
      .getByRole("button", { name: "Edit workout", exact: true })
      .click();
    await expect(page.locator(".workout-page")).toBeVisible();
    if (await page.locator(".workout-focused").isVisible())
      await page
        .getByRole("button", { name: "All exercises", exact: true })
        .click();
  }
  await openHistory();
  await expect(
    page.getByRole("button", { name: "Add exercise", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reorder Pullups", exact: true })
    .focus();
  await page
    .getByRole("button", { name: "Reorder Pullups", exact: true })
    .press("End");
  await page.getByRole("button", { name: "Open Pullups", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add set", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Options for Pullups", exact: true })
    .click();
  const options = page.getByRole("dialog", { name: "Pullups", exact: true });
  await expect(
    options.getByRole("button", { name: "Substitute exercise", exact: true }),
  ).toBeDisabled();
  await options.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  const voice = page.getByRole("dialog", {
    name: "Workout voice commands",
    exact: true,
  });
  await formControl(voice, "Command", { exact: true }).fill("Add a set");
  await voice.getByRole("button", { name: "Run command", exact: true }).click();
  expect(
    (await persisted(page)).sessions
      .at(-1)!
      .exercises.flatMap((entry) => entry.sets),
  ).toHaveLength(6);
  await voice.getByRole("button", { name: "Close", exact: true }).click();
  await formControl(page, "Pullups set 1 reps", { exact: true }).fill("4");
  await page
    .getByRole("button", { name: "Save corrections", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  const corrected = validateBackup(await persisted(page)).sessions.at(-1)!;
  expect(sessionStats(corrected).reps).toBe(29);
  expect(
    corrected.exercises.map((entry) => [
      entry.id,
      entry.sets.map((set) => [set.id, set.circuitRound]),
    ]),
  ).toEqual([originalIds[1], originalIds[2], originalIds[0]]);
  await page.reload();
  await openHistory();
  await page.getByRole("button", { name: "Open Pullups", exact: true }).click();
  await expect(
    formControl(page, "Pullups set 1 reps", { exact: true }),
  ).toHaveValue("4");
  await page
    .getByRole("button", { name: "Options for Pullups", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pullups", exact: true })
    .getByRole("button", { name: "Remove record from round 1", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pullups", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save corrections", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  const removed = validateBackup(await persisted(page)).sessions.at(-1)!;
  expect(sessionStats(removed).reps).toBe(25);
  expect(circuitRoundStats(removed)).toEqual({
    completed: 0,
    partial: 1,
    reps: 25,
  });
  await page.reload();
  expect(validateBackup(await persisted(page)).sessions.at(-1)).toEqual(
    removed,
  );
  await openHistory();
  await page.getByRole("button", { name: "Open Pushups", exact: true }).click();
  await page
    .getByRole("button", { name: "Options for Pushups", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("dialog", { name: "Pushups", exact: true })
    .getByRole("button", { name: "Remove movement records", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save corrections", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  const cleared = validateBackup(await persisted(page)).sessions.at(-1)!;
  expect(cleared.exercises.flatMap((entry) => entry.sets)).toHaveLength(6);
  expect(circuitRoundStats(cleared)).toEqual({
    completed: 0,
    partial: 1,
    reps: 15,
  });
  await page.reload();
  expect(validateBackup(await persisted(page)).sessions.at(-1)).toEqual(
    cleared,
  );
  await expect(page.getByText(/Your data could not be opened/)).toHaveCount(0);
});

test("fractional reps, negative numeric edits and empty drafts stay safe across active and recorded circuit reloads", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const pullups = data.exercises.find(
    (item) => item.measurement === "weight-reps" && item.load !== "none",
  )!;
  const hold = data.exercises.find((item) => item.id === "ex-plank")!;
  const cardio = data.exercises.find((item) => item.measurement === "cardio")!;
  const template: Template = {
    id: "safe-loop",
    name: "Safe actual fields",
    description: "",
    focus: "Calisthenics",
    minutes: 20,
    updatedAt: new Date().toISOString(),
    circuit: { durationSeconds: 1200 },
    exercises: [pullups, hold, cardio].map((exercise) => ({
      ...prescription(exercise),
      sets: 1,
    })),
  };
  data.templates.unshift(template);
  data.activeSession = createSession(data, template);
  await writeData(page, data);
  await page.locator(".resume-banner").click();
  const reps = formControl(page, `${pullups.name} actual reps`, {
    exact: true,
  });
  await reps.fill("2.5");
  await formControl(page, `${pullups.name} load (kg)`, { exact: true }).fill(
    "-5",
  );
  await formControl(page, `${hold.name} actual seconds`, { exact: true }).fill(
    "-3",
  );
  await formControl(page, `${cardio.name} actual seconds`, {
    exact: true,
  }).fill("-8");
  await formControl(page, `${cardio.name} distance (km)`, { exact: true }).fill(
    "-1.5",
  );
  let restored = validateBackup(await persisted(page)).activeSession!;
  expect(restored.exercises[0].sets[0]).toMatchObject({ reps: 2, weightKg: 0 });
  expect(restored.exercises[1].sets[0].durationSeconds).toBe(0);
  expect(restored.exercises[2].sets[0]).toMatchObject({
    durationSeconds: 0,
    distanceKm: 0,
  });
  await reps.fill("");
  await expect(reps).toHaveValue("");
  expect(
    validateBackup(await persisted(page)).activeSession!.exercises[0].sets[0]
      .reps,
  ).toBe(0);
  await page.reload();
  await page.locator(".resume-banner").click();
  await expect(reps).toHaveValue("0");
  await reps.fill("2");
  await formControl(page, `${hold.name} actual seconds`, { exact: true }).fill(
    "10",
  );
  await formControl(page, `${cardio.name} actual seconds`, {
    exact: true,
  }).fill("30");
  await page
    .getByRole("button", { name: "Record remaining round", exact: true })
    .click();
  await page
    .getByText("Review or correct recorded movements", { exact: true })
    .click();
  await formControl(page, `Round 1 ${pullups.name} reps`, { exact: true }).fill(
    "7.9",
  );
  await formControl(page, `Round 1 ${pullups.name} load (kg)`, {
    exact: true,
  }).fill("-3");
  await formControl(page, `Round 1 ${hold.name} seconds`, { exact: true }).fill(
    "-4",
  );
  await formControl(page, `Round 1 ${cardio.name} distance (km)`, {
    exact: true,
  }).fill("-2");
  restored = validateBackup(await persisted(page)).activeSession!;
  expect(restored.exercises[0].sets[0]).toMatchObject({
    reps: 7,
    weightKg: 0,
    completed: true,
  });
  expect(restored.exercises[1].sets[0]).toMatchObject({
    durationSeconds: 0,
    completed: true,
  });
  expect(restored.exercises[2].sets[0]).toMatchObject({
    distanceKm: 0,
    completed: true,
  });
  await page.reload();
  await page.locator(".resume-banner").click();
  expect(
    validateBackup(await persisted(page)).activeSession!.exercises,
  ).toEqual(restored.exercises);
  await expect(page.locator(".storage-error")).toHaveCount(0);
});
