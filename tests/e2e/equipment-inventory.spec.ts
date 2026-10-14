import { expect, test } from "@playwright/test";
import { formControl, persisted, quickOnboard, writeData } from "./helpers";

test("onboarding puts No equipment first, clears equipment, and saves an exclusive inventory", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  const setup = page.getByRole("dialog", { name: "Welcome to Setwise" });
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  const inventory = setup.locator(".equipment-inventory");
  const first = inventory.getByRole("checkbox").first();
  await expect(first).toHaveAccessibleName("No equipment");
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).toBeChecked();
  await first.check();
  expect(await inventory.locator("input:checked").count()).toBe(1);
  for (const control of await inventory.getByRole("checkbox").all()) {
    if ((await control.getAttribute("disabled")) !== null)
      await expect(control).not.toBeChecked();
  }
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).toBeDisabled();
  await expect(
    formControl(setup, "Maximum dumbbell weight (lb each), optional"),
  ).toBeDisabled();
  await expect(formControl(setup, "Bench can incline")).toBeDisabled();
  await first.uncheck();
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).toBeEnabled();
  await inventory
    .getByRole("checkbox", { name: "Dumbbells", exact: true })
    .check();
  await first.check();
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    setup.getByRole("button", { name: /^Start empty/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await setup
    .getByRole("button", { name: "Let’s get started", exact: true })
    .click();
  const saved = await persisted(page);
  expect(
    saved.equipment.find((profile) => profile.id === saved.activeEquipmentId)
      ?.items,
  ).toEqual(["No equipment"]);
  expect(saved.sessions).toHaveLength(0);
  await page.reload();
  expect(
    (await persisted(page)).equipment.find(
      (profile) => profile.id === saved.activeEquipmentId,
    )?.items,
  ).toEqual(["No equipment"]);
});

test("Settings normalizes legacy mixed choices on save and unlocks equipment after No equipment is unchecked", async ({
  page,
}) => {
  await quickOnboard(page);
  const saved = await persisted(page);
  const environment = saved.equipment.find(
    (profile) => profile.id === saved.activeEquipmentId,
  )!;
  environment.items = ["Dumbbells", "No equipment", "Custom rings"];
  await writeData(page, saved);
  await page
    .locator(".app-header")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByRole("button", { name: /^Equipment environments/ }).click();
  const environments = page.getByRole("dialog", {
    name: "Equipment environments",
    exact: true,
  });
  await environments
    .locator(".list-row")
    .filter({
      has: page.getByRole("button", {
        name: environment.name,
        exact: true,
      }),
    })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit environment",
    exact: true,
  });
  const inventory = editor.locator(".equipment-inventory");
  const none = inventory.getByRole("checkbox", {
    name: "No equipment",
    exact: true,
  });
  await expect(inventory.getByRole("checkbox").first()).toHaveAccessibleName(
    "No equipment",
  );
  await expect(none).toBeChecked();
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).not.toBeChecked();
  await expect(
    inventory.getByRole("checkbox", { name: "Dumbbells", exact: true }),
  ).toBeDisabled();
  await expect(
    formControl(editor, "Custom equipment", { exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Add", exact: true }),
  ).toBeDisabled();
  expect(
    (await persisted(page)).equipment.find(
      (profile) => profile.id === environment.id,
    )?.items,
  ).toEqual(["Dumbbells", "No equipment", "Custom rings"]);
  await none.uncheck();
  await expect(
    formControl(editor, "Custom equipment", { exact: true }),
  ).toBeEnabled();
  await none.focus();
  await none.press("Space");
  await expect(none).toBeChecked();
  await editor
    .getByRole("button", { name: "Save environment", exact: true })
    .click();
  expect(
    (await persisted(page)).equipment.find(
      (profile) => profile.id === environment.id,
    )?.items,
  ).toEqual(["No equipment"]);
  expect((await persisted(page)).sessions).toEqual(saved.sessions);
});
