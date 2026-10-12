import { describe, expect, it } from "vitest";
import {
  changeEquipmentSelection,
  equipmentChoices,
  NO_EQUIPMENT,
  normalizeEquipmentSelection,
} from "./equipmentSelection";

describe("Exclusive equipment-free inventories", () => {
  it("puts No equipment first and keeps custom options in the remaining sorted list", () => {
    expect(
      equipmentChoices([
        "Resistance bands",
        "Dumbbells",
        "Cable machine",
        "Dumbbells",
      ]),
    ).toEqual([NO_EQUIPMENT, "Cable machine", "Dumbbells", "Resistance bands"]);
    expect(equipmentChoices([])).toEqual([NO_EQUIPMENT]);
  });

  it("selecting No equipment clears equipment and leaves the source record untouched", () => {
    const previous = ["Dumbbells", "Exercise mat", "Custom rings"];
    expect(changeEquipmentSelection(previous, NO_EQUIPMENT, true)).toEqual([
      NO_EQUIPMENT,
    ]);
    expect(previous).toEqual(["Dumbbells", "Exercise mat", "Custom rings"]);
  });

  it("blocks adding equipment until No equipment is explicitly unchecked", () => {
    const selected = [NO_EQUIPMENT];
    expect(changeEquipmentSelection(selected, "Dumbbells", true)).toEqual(
      selected,
    );
    const unchecked = changeEquipmentSelection(selected, NO_EQUIPMENT, false);
    expect(unchecked).toEqual([]);
    expect(changeEquipmentSelection(unchecked, "Dumbbells", true)).toEqual([
      "Dumbbells",
    ]);
  });

  it("normalizes legacy mixed inventories only into a new edited selection", () => {
    const legacy = ["Dumbbells", NO_EQUIPMENT, "Exercise mat"];
    expect(normalizeEquipmentSelection(legacy)).toEqual([NO_EQUIPMENT]);
    expect(changeEquipmentSelection(legacy, NO_EQUIPMENT, false)).toEqual([]);
    expect(legacy).toEqual(["Dumbbells", NO_EQUIPMENT, "Exercise mat"]);
  });

  it("preserves ordinary equipment choices and supports removal and deduplication", () => {
    expect(normalizeEquipmentSelection(["Dumbbells", "Exercise mat"])).toEqual([
      "Dumbbells",
      "Exercise mat",
    ]);
    expect(changeEquipmentSelection(["Dumbbells"], "Dumbbells", true)).toEqual([
      "Dumbbells",
    ]);
    expect(
      changeEquipmentSelection(
        ["Dumbbells", "Exercise mat"],
        "Dumbbells",
        false,
      ),
    ).toEqual(["Exercise mat"]);
  });
});
