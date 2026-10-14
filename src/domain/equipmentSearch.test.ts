import { describe, expect, it } from "vitest";
import { filterEquipment } from "./equipmentSearch";
import { equipmentChoices } from "./equipmentSelection";

describe("equipment discovery", () => {
  const choices = equipmentChoices([
    "Dumbbells",
    "Barbell",
    "Custom gym rings",
    "Cable machine",
    "Exercise mat",
  ]);
  it("keeps the equipment-free choice first while supporting transposed and omitted letters", () => {
    expect(filterEquipment(choices, "dumbell")).toEqual([
      "No equipment",
      "Dumbbells",
    ]);
    expect(filterEquipment(choices, "barbel")).toEqual([
      "No equipment",
      "Barbell",
    ]);
    expect(filterEquipment(choices, "calbe")).toEqual([
      "No equipment",
      "Cable machine",
    ]);
  });
  it("matches custom names, accents, punctuation, and all query words", () => {
    expect(filterEquipment(choices, "GYM-rigns")).toEqual([
      "No equipment",
      "Custom gym rings",
    ]);
    expect(filterEquipment(choices, "câble machine")).toEqual([
      "No equipment",
      "Cable machine",
    ]);
    expect(filterEquipment(choices, "cable rings")).toEqual(["No equipment"]);
  });
  it("does not fuzz short unrelated searches or mutate the catalog", () => {
    expect(filterEquipment(choices, "xyz")).toEqual(["No equipment"]);
    expect(filterEquipment(choices, "  ")).toEqual(choices);
    expect(choices).toContain("Custom gym rings");
  });
});
