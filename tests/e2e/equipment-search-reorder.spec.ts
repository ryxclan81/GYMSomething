import { expect, test } from "@playwright/test";
import { prescription } from "../../src/domain/helpers";
import type { Template } from "../../src/domain/types";
import { formControl, persisted, quickOnboard, writeData } from "./helpers";

test("equipment search accepts typos and bulk selection preserves hidden choices", async ({
  page,
}) => {
  await quickOnboard(page);
  const before = await persisted(page);
  const environment = before.equipment.find(
    (item) => item.id === before.activeEquipmentId,
  )!;
  environment.items = ["Dumbbells", "Custom rings"];
  await writeData(page, before);
  await page
    .locator(".app-header")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByRole("button", { name: /^Equipment environments/ }).click();
  const environments = page.getByRole("dialog", {
    name: "Equipment environments",
    exact: true,
  });
  const edit = environments
    .locator(".list-row")
    .filter({
      has: page.getByRole("button", { name: environment.name, exact: true }),
    })
    .getByRole("button", { name: "Edit", exact: true });
  expect(
    await edit.evaluate((button) => getComputedStyle(button).textAlign),
  ).toBe("center");
  await edit.click();
  const editor = page.getByRole("dialog", {
    name: "Edit environment",
    exact: true,
  });
  const search = formControl(editor, "Search equipment", { exact: true });
  const inventory = editor.locator(".equipment-inventory");
  await search.fill("calbe");
  await expect(inventory.getByRole("checkbox").first()).toHaveAccessibleName(
    "No equipment",
  );
  const filtered = await inventory.locator("label").allTextContents();
  expect(filtered.some((name) => /cable/i.test(name))).toBe(true);
  await editor
    .getByRole("button", { name: "Select all shown", exact: true })
    .click();
  await search.fill("dumbell");
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).toBeChecked();
  await search.fill("custom rigns");
  await expect(
    inventory.getByRole("checkbox", { name: "Custom rings", exact: true }),
  ).toBeChecked();
  const none = inventory.getByRole("checkbox", {
    name: "No equipment",
    exact: true,
  });
  await none.check();
  await expect(
    inventory.getByRole("checkbox", { name: "Custom rings", exact: true }),
  ).toBeDisabled();
  await editor
    .getByRole("button", { name: "Select all shown", exact: true })
    .click();
  await expect(none).not.toBeChecked();
  await expect(
    inventory.getByRole("checkbox", { name: "Custom rings", exact: true }),
  ).toBeChecked();
  await editor
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  expect(await inventory.locator("input:checked").count()).toBe(0);
  await search.fill("");
  await editor.getByRole("button", { name: "Select all", exact: true }).click();
  const total = await inventory.getByRole("checkbox").count();
  expect(await inventory.locator("input:checked").count()).toBe(total - 1);
  await expect(none).not.toBeChecked();
  await editor
    .getByRole("button", { name: "Save environment", exact: true })
    .click();
  const saved = await persisted(page);
  const items = saved.equipment.find(
    (item) => item.id === environment.id,
  )!.items;
  expect(items).toHaveLength(total - 1);
  expect(items).toContain("Custom rings");
  expect(items).not.toContain("No equipment");
  expect(saved.sessions).toEqual(before.sessions);
  await environments
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.reload();
  expect(
    (await persisted(page)).equipment.find(
      (item) => item.id === environment.id,
    )!.items,
  ).toEqual(items);
});

test("exercise grips move actual rows by mouse, touch, keyboard and tap and persist their original IDs", async ({
  page,
}) => {
  await quickOnboard(page);
  const data = await persisted(page);
  const ids = ["ex-pullups", "ex-pushups", "ex-bodyweight-squat"];
  const entries = ids.map((id, index) => ({
    ...prescription(data.exercises.find((exercise) => exercise.id === id)!),
    id: `stable-order-${index}`,
  }));
  const template: Template = {
    id: "reorder-test",
    name: "Available machines",
    description: "Test equipment rotation",
    focus: "General fitness",
    minutes: 30,
    exercises: entries,
    updatedAt: new Date().toISOString(),
  };
  data.templates = [template];
  data.programs = [];
  data.schedule = [];
  await writeData(page, data);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page
    .locator(".plan-page .segmented-control")
    .getByRole("button", { name: "Workouts", exact: true })
    .click();
  await page
    .locator(".template-row")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit workout",
    exact: true,
  });
  const list = editor.getByRole("list", {
    name: "Workout exercise order",
    exact: true,
  });
  const order = () =>
    list
      .locator("[data-reorder-item]")
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-reorder-item")),
      );
  expect(await order()).toEqual(entries.map((entry) => entry.id));
  const grip = list.getByRole("button", {
    name: "Reorder Bodyweight Squat",
    exact: true,
  });
  await grip.scrollIntoViewIfNeeded();
  const start = (await grip.boundingBox())!;
  const target = (await list
    .locator("[data-reorder-item]")
    .first()
    .boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 20, target.y + target.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  expect(await order()).toEqual([entries[2].id, entries[0].id, entries[1].id]);
  await grip.focus();
  await page.keyboard.press("ArrowDown");
  expect(await order()).toEqual([entries[0].id, entries[2].id, entries[1].id]);
  await expect(
    editor.locator(".reorder-list-area").getByRole("status"),
  ).toContainText("Bodyweight Squat moved to position 2 of 3");
  await grip.click();
  await editor
    .getByRole("button", { name: "Move to last Bodyweight Squat", exact: true })
    .click();
  expect(await order()).toEqual(entries.map((entry) => entry.id));
  await grip.focus();
  await page.keyboard.press("Home");
  expect(await order()).toEqual([entries[2].id, entries[0].id, entries[1].id]);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const touchDrag = async (label: string, cancel = false) => {
    const handle = list.getByRole("button", {
      name: `Reorder ${label}`,
      exact: true,
    });
    await handle.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!;
    const to = (await list
      .locator("[data-reorder-item]")
      .first()
      .boundingBox())!;
    const x = from.x + from.width / 2;
    const y = from.y + from.height / 2;
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 8; step++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + ((to.y + to.height / 2 - y) * step) / 8 }],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
  };
  await touchDrag("Pushups");
  expect(await order()).toEqual([entries[1].id, entries[2].id, entries[0].id]);
  await touchDrag("Pullups", true);
  expect(await order()).toEqual([entries[1].id, entries[2].id, entries[0].id]);
  await touch.detach();
  await editor
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  const saved = (await persisted(page)).templates.find(
    (item) => item.id === template.id,
  )!;
  expect(saved.exercises).toEqual([entries[1], entries[2], entries[0]]);
  await page.reload();
  expect(
    (await persisted(page)).templates.find((item) => item.id === template.id)!
      .exercises,
  ).toEqual(saved.exercises);
});
