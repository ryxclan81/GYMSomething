export const NO_EQUIPMENT = "No equipment";

/** Keep the bodyweight choice first, including for custom inventories. */
export function equipmentChoices(items: readonly string[]): string[] {
  return [
    NO_EQUIPMENT,
    ...[...new Set(items)]
      .filter((item) => item !== NO_EQUIPMENT)
      .sort((a, b) => a.localeCompare(b)),
  ];
}

/** Normalize edited inventories without changing historical equipment records. */
export function normalizeEquipmentSelection(
  items: readonly string[],
): string[] {
  return items.includes(NO_EQUIPMENT) ? [NO_EQUIPMENT] : [...new Set(items)];
}

export function changeEquipmentSelection(
  items: readonly string[],
  item: string,
  checked: boolean,
): string[] {
  const selected = normalizeEquipmentSelection(items);
  if (item === NO_EQUIPMENT)
    return checked
      ? [NO_EQUIPMENT]
      : selected.filter((value) => value !== item);
  if (selected.includes(NO_EQUIPMENT)) return selected;
  return checked
    ? [...new Set([...selected, item])]
    : selected.filter((value) => value !== item);
}
