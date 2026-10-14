import { expect, type Locator, type Page } from "@playwright/test";
import {
  STORAGE_KEY,
  decodePersistedData,
  decodePersistedRecord,
  encodePersistedData,
} from "../../src/state/persistence";
import type { AppData } from "../../src/domain/types";
import { starterPresetData } from "../../src/data/defaults";

export function formControl(
  scope: Page | Locator,
  label: string | RegExp,
  options?: { exact?: boolean },
): Locator {
  return scope
    .getByLabel(label, options)
    .and(scope.locator("input,textarea,select,[role='combobox']"));
}

export async function persisted(page: Page): Promise<AppData> {
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-saving",
    "false",
  );
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  if (!raw) throw new Error("No saved phone-local record.");
  return decodePersistedData(raw);
}
export async function writeData(page: Page, data: AppData) {
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-saving",
    "false",
  );
  const previous = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  const revision = previous ? decodePersistedRecord(previous).revision + 1 : 0;
  const raw = encodePersistedData(data, revision);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw,
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
}
export async function choose(
  control: Locator,
  valueOrLabel: string,
  byLabel = false,
) {
  if (byLabel) {
    await control.click();
    await control
      .page()
      .getByRole("option", { name: valueOrLabel, exact: true })
      .click();
  } else {
    await control.click();
    const encoded =
      valueOrLabel === "" ? "__forma_empty_choice__" : valueOrLabel;
    await control
      .page()
      .locator(`[role="option"][data-value=${JSON.stringify(encoded)}]`)
      .click();
  }
}
export async function quickOnboard(
  page: Page,
  {
    name = "",
    unit = "kg",
    seedLibrary = true,
  }: { name?: string; unit?: "kg" | "lb"; seedLibrary?: boolean } = {},
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  const welcome = page.getByRole("dialog", { name: "Welcome to Setwise" });
  await expect(welcome).toBeVisible();
  if (name)
    await welcome
      .getByRole("textbox", { name: /What should we call you/ })
      .fill(name);
  await welcome
    .getByRole("button", { name: unit === "kg" ? /^Kilograms/ : /^Pounds/ })
    .click();
  await welcome
    .getByRole("button", { name: "Use defaults", exact: true })
    .click();
  await welcome
    .getByRole("button", { name: "Let’s get started", exact: true })
    .click();
  await expect(welcome).not.toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-saving",
    "false",
  );
  // Most regression journeys exercise an existing user's saved library. Fresh
  // onboarding and opt-in behavior are covered separately without this fixture.
  if (seedLibrary) {
    const data = await persisted(page);
    if (!data.templates.length && !data.programs.length) {
      const fixture = starterPresetData();
      data.templates = fixture.templates;
      data.programs = fixture.programs;
      await writeData(page, data);
    }
  }
}
