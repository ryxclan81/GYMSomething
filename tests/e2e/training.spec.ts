import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  formControl,
  choose,
  persisted,
  writeData,
  quickOnboard as onboard,
} from "./helpers";
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}

test("manual goals preserve milestones and logged progress after reload", async ({
  page,
}) => {
  await onboard(page);
  await navigate(page, "Progress");
  await page
    .getByRole("button", { name: "Create a goal", exact: true })
    .click();
  let dialog = page.getByRole("dialog", { name: "Set a goal" });
  await formControl(dialog, "Goal name").fill("Practice milestone");
  await choose(formControl(dialog, "Goal type"), "Custom numeric goal", true);
  await formControl(dialog, "Starting value").fill("0");
  await formControl(dialog, "Target value").fill("10");
  await formControl(dialog, "Current value").fill("3");
  await dialog.getByRole("button", { name: "Save goal", exact: true }).click();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  const row = page
    .locator(".goal-row")
    .filter({ hasText: "Practice milestone" });
  await expect(row).toContainText("30%");
  await row.click();
  dialog = page.getByRole("dialog", { name: "Practice milestone" });
  await formControl(dialog, "Log a new value").fill("6");
  await dialog.getByRole("button", { name: "Log progress" }).click();
  await expect(row).toContainText("60%");
  await page.reload();
  await navigate(page, "Progress");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(
    page.locator(".goal-row").filter({ hasText: "Practice milestone" }),
  ).toContainText("60%");
  const saved = (await persisted(page)).goals.find(
    (g) => g.name === "Practice milestone",
  )!;
  expect(saved.current).toBe(6);
  expect(saved.history.map((h) => h.value)).toEqual([3, 6]);
});

test("program scheduling creates lighter-session copies and applying again is idempotent", async ({
  page,
}) => {
  await onboard(page);
  await navigate(page, "Plan");
  await page.getByRole("button", { name: "Programs", exact: true }).click();
  await page.getByRole("button", { name: "New program", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "New program" });
  await formControl(dialog, "Program name").fill("Four Week Focus");
  await choose(
    formControl(dialog, "Schedule length (optional)"),
    "4 weeks",
    true,
  );
  await choose(formControl(dialog, "Planned lighter week"), "Week 4", true);
  await dialog
    .locator("label.list-row")
    .filter({ hasText: "Full Body A" })
    .getByRole("checkbox")
    .check();
  await formControl(dialog, "Also schedule dates now").check();
  await dialog
    .getByRole("button", { name: "Save program", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const initial = await persisted(page);
  const program = initial.programs.find((p) => p.name === "Four Week Focus")!;
  expect(program.weeks).toBe(4);
  expect(program.deloadWeek).toBe(4);
  const lighter = initial.templates.find(
    (t) => t.name === "Four Week Focus · lighter · Full Body A",
  )!;
  expect(lighter).toBeTruthy();
  expect(lighter.exercises[0].sets).toBe(2);
  expect(
    initial.schedule.some((s) => s.templateId === lighter.id),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Edit Four Week Focus", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit program" });
  await formControl(dialog, "Also schedule dates now").check();
  await dialog
    .getByRole("button", { name: "Save program", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect((await persisted(page)).schedule.length).toBe(initial.schedule.length);
});

test("accepting a modified progression changes future targets and preserves recorded snapshots", async ({
  page,
}) => {
  await onboard(page);
  const data = await persisted(page);
  const template = data.templates.find((t) => t.id === "tpl-strength")!;
  const p = template.exercises[0];
  p.weightKg = 50;
  const exercise = data.exercises.find((e) => e.id === p.exerciseId)!;
  const now = new Date().toISOString();
  data.sessions = [
    {
      id: "test-session",
      templateId: template.id,
      name: template.name,
      equipmentId: data.activeEquipmentId,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: now,
      notes: "",
      exercises: [
        {
          id: "test-entry",
          exerciseId: exercise.id,
          exercise: structuredClone(exercise),
          prescription: structuredClone(p),
          notes: "",
          sets: [
            {
              id: "test-set",
              weightKg: 50,
              reps: 5,
              durationSeconds: 0,
              distanceKm: 0,
              type: "working",
              completed: true,
              skipped: false,
              completedAt: now,
            },
          ],
        },
      ],
    },
  ];
  data.suggestions = [
    {
      id: "test-suggestion",
      exerciseId: exercise.id,
      templateId: template.id,
      createdAt: now,
      status: "pending",
      strategy: "double",
      current: 50,
      proposed: 52.5,
      field: "weightKg",
      reason: "Configured test progression threshold was met.",
      confidence: "moderate",
    },
  ];
  await writeData(page, data);
  await navigate(page, "Progress");
  await page.getByRole("button", { name: "Review & accept" }).click();
  const dialog = page.getByRole("dialog", { name: "Review recommendation" });
  await formControl(dialog, "Target load (kg)").fill("55");
  await dialog
    .getByRole("button", { name: "Accept this target", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const result = await persisted(page);
  expect(result.suggestions[0].status).toBe("accepted");
  expect(result.suggestions[0].proposed).toBe(55);
  expect(
    result.templates.find((t) => t.id === template.id)!.exercises[0].weightKg,
  ).toBe(55);
  expect(result.sessions[0].exercises[0].prescription.weightKg).toBe(50);
  expect(result.sessions[0].exercises[0].sets[0].weightKg).toBe(50);
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await expect(
    page.locator(".record-row").filter({ hasText: "Heaviest load" }),
  ).toContainText("50.0");
});

test("bodyweight measurements update relative goals and custom strength benchmarks persist", async ({
  page,
}) => {
  await onboard(page);
  const data = await persisted(page);
  const template = data.templates.find((t) => t.id === "tpl-strength")!;
  const p = template.exercises[0];
  const exercise = data.exercises.find((e) => e.id === p.exerciseId)!;
  const now = new Date().toISOString();
  data.profile.bodyweightKg = 80;
  data.sessions = [
    {
      id: "tier-session",
      templateId: template.id,
      name: template.name,
      equipmentId: data.activeEquipmentId,
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      completedAt: now,
      notes: "",
      exercises: [
        {
          id: "tier-entry",
          exerciseId: exercise.id,
          exercise: structuredClone(exercise),
          prescription: structuredClone(p),
          notes: "",
          sets: [
            {
              id: "tier-set",
              weightKg: 80,
              reps: 1,
              durationSeconds: 0,
              distanceKm: 0,
              type: "working",
              completed: true,
              skipped: false,
              completedAt: now,
            },
          ],
        },
      ],
    },
  ];
  await writeData(page, data);
  await navigate(page, "Progress");
  const benchmark = page
    .getByRole("button")
    .filter({ hasText: exercise.name })
    .filter({ hasText: "recorded load" });
  await benchmark.click();
  const dialog = page.getByRole("dialog", {
    name: "Customize strength benchmark",
  });
  await formControl(dialog, "Label", { exact: true })
    .nth(2)
    .fill("Personal milestone");
  await dialog
    .getByRole("button", { name: "Save thresholds", exact: true })
    .click();
  await expect(benchmark).toContainText("Personal milestone");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const measurement = page.getByRole("dialog", { name: "Log a measurement" });
  await formControl(measurement, "Bodyweight (kg)").fill("75");
  await measurement
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  const result = await persisted(page);
  expect(result.profile.bodyweightKg).toBe(75);
  expect(result.bodyMetrics.at(-1)!.weightKg).toBe(75);
  expect(result.strengthThresholds![exercise.id][2].label).toBe(
    "Personal milestone",
  );
});

test("pound conversions and timed zero-repetition rules do not block template saving", async ({
  page,
}) => {
  await onboard(page);
  const data = await persisted(page);
  data.profile.unit = "lb";
  const template = data.templates.find((t) => t.id === "tpl-full-a")!;
  template.exercises[0].weightKg = 50;
  await writeData(page, data);
  await navigate(page, "Plan");
  await page.locator(".plan-page .segmented-control").getByRole("button", { name: "Workouts", exact: true }).click();
  await page
    .locator(".template-row")
    .filter({ hasText: "Full Body A" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit workout" });
  await dialog
    .locator(".prescription-editor")
    .first()
    .locator(".text-button")
    .click();
  await expect(dialog.locator("input:invalid")).toHaveCount(0);
  await dialog
    .locator(".prescription-editor")
    .last()
    .locator(".text-button")
    .click();
  await dialog
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const result = await persisted(page);
  expect(
    result.templates.find((t) => t.id === template.id)!.exercises[0].weightKg,
  ).toBe(50);
});

test("a custom exercise created inside the active-workout picker can be logged and restored", async ({
  page,
}) => {
  await onboard(page);
  await navigate(page, "Workouts");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Open workout", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  const picker = page.getByRole("dialog", {
    name: "Add an exercise",
    exact: true,
  });
  await expect(picker).toBeVisible();
  await picker
    .getByRole("button", { name: "Create custom exercise", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Create an exercise",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await formControl(editor, "Name", { exact: true }).fill(
    "Nested incline push-up",
  );
  await formControl(
    editor,
    "Primary muscles / activity (comma separated)",
  ).fill("Chest, Triceps");
  await choose(
    formControl(editor, "Tracking", { exact: true }),
    "Bodyweight repetitions",
    true,
  );
  await choose(
    formControl(editor, "Load convention", { exact: true }),
    "No external load",
    true,
  );
  await formControl(editor, "Instructions").fill(
    "Place your hands on a stable elevated surface. Lower under control, then press back to the starting position.",
  );
  await editor
    .getByRole("button", { name: "Save exercise", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(picker).toBeVisible();
  await formControl(picker, "Search exercises").fill("Nested incline push-up");
  await picker
    .getByRole("button", { name: "Add Nested incline push-up", exact: true })
    .click();
  await expect(picker).not.toBeVisible();
  await page
    .getByRole("button", { name: "Open Nested incline push-up", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Complete Nested incline push-up set 1",
      exact: true,
    })
    .click();
  let data = await persisted(page);
  const custom = data.exercises.find(
    (e) => e.name === "Nested incline push-up",
  )!;
  expect(custom.custom).toBe(true);
  expect(custom.primary).toEqual(["Chest", "Triceps"]);
  expect(data.activeSession!.exercises[0].exerciseId).toBe(custom.id);
  expect(data.activeSession!.exercises[0].sets[0].completed).toBe(true);
  await page.reload();
  await expect(page.locator(".resume-banner")).toBeVisible();
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("heading", { name: "Nested incline push-up", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Undo Nested incline push-up set 1",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  data = await persisted(page);
  expect(data.activeSession!.exercises[0].exerciseId).toBe(custom.id);
  expect(data.activeSession!.exercises[0].sets[0].completed).toBe(true);
});

test("workout overview opens a persistent focused exercise and preserves clearable entries, next navigation and history corrections", async ({
  page,
}) => {
  await onboard(page);
  await navigate(page, "Workouts");
  await page
    .locator(".template-card")
    .filter({ hasText: "Full Body A" })
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workout-overview-card")).toHaveCount(4);
  await expect(page.locator(".exercise-log")).toHaveCount(0);
  const started = (await persisted(page)).activeSession!;
  expect(started.focusedExerciseId).toBeUndefined();
  const [first, second] = started.exercises;
  for (const entry of started.exercises) {
    const card = page.getByRole("button", {
      name: `Open ${entry.exercise.name}`,
      exact: true,
    });
    await expect(card).toContainText("Primary");
    await expect(card).toContainText(entry.exercise.primary.join(" · "));
    await expect(card).toContainText("Secondary");
  }
  await page
    .getByRole("button", { name: `Open ${first.exercise.name}`, exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveClass(/focus-mode/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
  await expect(page.locator(".exercise-log")).toHaveCount(1);
  const weight = formControl(page, `${first.exercise.name} set 1 weight`, {
    exact: true,
  });
  const reps = formControl(page, `${first.exercise.name} set 1 reps`, {
    exact: true,
  });
  await weight.click();
  await weight.pressSequentially("50");
  await expect(weight).toHaveValue("50");
  await weight.fill("");
  await expect(weight).toHaveValue("");
  await weight.fill("50");
  await reps.fill("");
  await expect(reps).toHaveValue("");
  await reps.fill("6");
  await page
    .getByRole("button", {
      name: `Complete ${first.exercise.name} set 1`,
      exact: true,
    })
    .click();
  await expect(page.locator(".rest-dock")).toBeVisible();
  let saved = (await persisted(page)).activeSession!;
  expect(saved.focusedExerciseId).toBe(first.id);
  expect(saved.exercises[0].sets[0]).toMatchObject({
    weightKg: 50,
    reps: 6,
    completed: true,
  });
  await page.getByRole("button", { name: "Technique", exact: true }).click();
  const technique = page.getByRole("dialog", {
    name: `${first.exercise.name} · technique`,
    exact: true,
  });
  await expect(technique).toContainText(first.exercise.instructions[0]);
  await technique.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Next exercise", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: second.exercise.name, exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).activeSession!.focusedExerciseId).toBe(
    second.id,
  );
  await page.reload();
  await page.locator(".resume-banner").click();
  await expect(
    page.getByRole("heading", { name: second.exercise.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Previous exercise", exact: true })
    .click();
  await expect(
    formControl(page, `${first.exercise.name} set 1 reps`, { exact: true }),
  ).toHaveValue("6");
  await page
    .getByRole("button", { name: "All exercises", exact: true })
    .click();
  await expect(page.locator(".app-shell")).not.toHaveClass(/focus-mode/);
  await expect(
    page.getByRole("button", {
      name: `Open ${first.exercise.name}`,
      exact: true,
    }),
  ).toContainText("1/3 sets logged");
  expect(
    (await persisted(page)).activeSession!.focusedExerciseId,
  ).toBeUndefined();
  const hold = started.exercises.find(
    (entry) => entry.exercise.measurement === "duration",
  )!;
  await page
    .getByRole("button", { name: `Open ${hold.exercise.name}`, exact: true })
    .click();
  const seconds = formControl(
    page,
    `${hold.exercise.name} set 1 duration in seconds`,
    { exact: true },
  );
  await seconds.fill("");
  await expect(seconds).toHaveValue("");
  await seconds.fill("45");
  await expect(
    formControl(page, `${hold.exercise.name} set 1 type`),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: `Edit set 1 type for ${hold.exercise.name}`,
      exact: true,
    })
    .click();
  const setOptions = page.getByRole("dialog", {
    name: hold.exercise.name,
    exact: true,
  });
  await choose(
    formControl(setOptions, "Set 1 category", { exact: true }),
    "Warm-up",
    true,
  );
  expect(
    (await persisted(page)).activeSession!.exercises.find(
      (entry) => entry.id === hold.id,
    )!.sets[0].type,
  ).toBe("warmup");
  await choose(
    formControl(setOptions, "Set 1 category", { exact: true }),
    "Timed",
    true,
  );
  await setOptions.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", {
      name: `Complete ${hold.exercise.name} set 1`,
      exact: true,
    })
    .click();
  saved = (await persisted(page)).activeSession!;
  expect(
    saved.exercises.find((entry) => entry.id === hold.id)!.sets[0],
  ).toMatchObject({ durationSeconds: 45, type: "timed", completed: true });
  await page
    .getByRole("button", { name: "Back to all exercises", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Good / }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review saved workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work put in." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(page.locator(".workout-overview-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: `Open ${first.exercise.name}`, exact: true })
    .click();
  await formControl(page, `${first.exercise.name} set 1 reps`, {
    exact: true,
  }).fill("7");
  await page
    .getByRole("button", { name: "Save corrections", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Work put in." }),
  ).toBeVisible();
  const corrected = await persisted(page);
  expect(corrected.sessions).toHaveLength(1);
  expect(corrected.sessions[0].exercises[0].sets[0]).toMatchObject({
    weightKg: 50,
    reps: 7,
    completed: true,
  });
});

test("workout overview and focused logging fit phone and desktop screens with accessible controls", async ({
  page,
}) => {
  await onboard(page);
  await navigate(page, "Workouts");
  await page
    .locator(".template-card")
    .filter({ hasText: "Full Body A" })
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const exercise = (await persisted(page)).activeSession!.exercises[0].exercise;
  for (const width of [320, 393, 1440]) {
    await page.setViewportSize({ width, height: 852 });
    await expect(page.locator(".workout-overview-card")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/screenshots/workout-overview-${width}.png`,
      fullPage: true,
    });
    if (width === 393)
      expect(
        (await new AxeBuilder({ page }).include(".workout-page").analyze())
          .violations,
      ).toEqual([]);
    await page
      .getByRole("button", { name: `Open ${exercise.name}`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: exercise.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next exercise", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Finish workout", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/screenshots/workout-focus-${width}.png`,
      fullPage: true,
    });
    if (width === 393)
      expect(
        (await new AxeBuilder({ page }).include(".workout-page").analyze())
          .violations,
      ).toEqual([]);
    await page
      .getByRole("button", { name: "All exercises", exact: true })
      .click();
  }
});

test("focused workout keeps navigation reachable with larger text, landscape and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onboard(page);
  await navigate(page, "Workouts");
  await page
    .locator(".template-card")
    .filter({ hasText: "Full Body A" })
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const card = page.getByRole("button", {
    name: "Open Barbell Full Squat",
    exact: true,
  });
  expect(
    await card.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  await card.click();
  const largeText = await page.addStyleTag({
    content: `
    .workout-focused h1 { font-size: 45px !important; }
    .workout-focused h2 { font-size: 30px !important; }
    .workout-focused p, .workout-focused .muted, .workout-focused .workout-muscles,
    .workout-focused .focus-back { font-size: 18px !important; }
    .workout-focused .muscle-label, .workout-focused .focus-prescription>div>span,
    .workout-focused .set-head, .workout-focused .focus-navigation small { font-size: 12px !important; }
    .workout-focused .focus-next strong, .workout-focused .focus-finish { font-size: 18px !important; }
    .workout-focused input { font-size: 28px !important; }
  `,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Next exercise", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Finish workout", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "artifacts/screenshots/workout-focus-larger-text.png",
    fullPage: true,
  });
  await largeText.evaluate((element) =>
    element.parentNode?.removeChild(element),
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await formControl(page, "Barbell Full Squat set 1 reps", {
    exact: true,
  }).fill("9");
  await page
    .getByRole("button", {
      name: "Complete Barbell Full Squat set 1",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "All exercises", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Next exercise", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Finish workout", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect((await persisted(page)).activeSession!.exercises[0].sets[0].reps).toBe(
    9,
  );
  await page.screenshot({
    path: "artifacts/screenshots/workout-focus-landscape.png",
  });
});

test("training screens remain usable across mobile and desktop with accessible controls", async ({
  page,
}) => {
  await onboard(page);
  for (const width of [320, 393, 1440]) {
    await page.setViewportSize({ width, height: 852 });
    const nav = page.getByRole("navigation", {
      name: width >= 800 ? "Main navigation" : "Mobile navigation",
    });
    for (const screen of ["Plan", "Progress", "Library"]) {
      if (screen === "Library") {
        await nav.getByRole("button", { name: "Workouts", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Your workouts.", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Exercise library", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: /Exercise library/ }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", {
            name: "Create custom exercise",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", {
            name: "Create custom exercise",
            exact: true,
          }),
        ).toBeInViewport();
      } else {
        await nav.getByRole("button", { name: screen, exact: true }).click();
        await expect(
          page.getByRole("heading", {
            name: new RegExp(`Your ${screen.toLowerCase()}`),
          }),
        ).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `artifacts/screenshots/training-${screen.toLowerCase()}-${width}.png`,
      });
      if (width === 393) {
        const result = await new AxeBuilder({ page })
          .include(`.${screen.toLowerCase()}-page`)
          .analyze();
        expect(result.violations).toEqual([]);
      }
    }
  }
});
