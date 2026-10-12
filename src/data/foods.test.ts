import { describe, expect, it } from "vitest";
import { foodCatalogSource, foodSourceUrl, starterFoods } from "./foods";

describe("Verified offline USDA reference foods", () => {
  it("contains the documented broad catalog with unique IDs and source links", () => {
    expect(starterFoods).toHaveLength(905);
    expect(starterFoods.length).toBe(foodCatalogSource.selectedRecords);
    expect(new Set(starterFoods.map((food) => food.id)).size).toBe(
      starterFoods.length,
    );
    expect(Object.keys(foodCatalogSource.categoryCounts)).toHaveLength(21);
    expect(
      Object.values(foodCatalogSource.categoryCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(starterFoods.length);
    expect(
      starterFoods.every((food) => food.notes?.includes(foodSourceUrl(food)!)),
    ).toBe(true);
    expect(
      starterFoods.every(
        (food) =>
          food.servingGrams === 100 && food.source.includes("SR Legacy (2018)"),
      ),
    ).toBe(true);
  });
  it("keeps required source values finite and nonnegative without creating barcodes", () => {
    for (const food of starterFoods) {
      for (const amount of [
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
      ]) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
      if (food.fiber !== undefined)
        expect(food.fiber).toBeGreaterThanOrEqual(0);
      expect(food).not.toHaveProperty("barcode");
    }
  });
  it.each([
    ["usda-sr-173904", "dry", 379, 13.2, 67.7, 6.52],
    ["usda-sr-171477", "cooked, roasted", 165, 31, 0, 3.57],
    ["usda-sr-173424", "hard-boiled", 155, 12.6, 1.12, 10.6],
    ["usda-sr-169757", "cooked without salt", 130, 2.69, 28.2, 0.28],
    ["usda-sr-170894", "plain, nonfat", 59, 10.2, 3.6, 0.39],
  ] as const)(
    "preserves preparation-specific source values for %s",
    (id, preparation, calories, protein, carbs, fat) => {
      const food = starterFoods.find((entry) => entry.id === id)!;
      expect(food.name).toContain(preparation);
      expect(food).toMatchObject({
        calories,
        protein,
        carbs,
        fat,
        servingGrams: 100,
      });
    },
  );
  it("includes all deliberately selected common references and keeps the seed immutable", () => {
    expect(foodCatalogSource.selection.priorityFdcIds).toHaveLength(40);
    for (const id of foodCatalogSource.selection.priorityFdcIds)
      expect(starterFoods.some((food) => food.id === `usda-sr-${id}`)).toBe(
        true,
      );
    expect(Object.isFrozen(starterFoods)).toBe(true);
    expect(starterFoods.every(Object.isFrozen)).toBe(true);
    const copy = structuredClone(starterFoods[0]);
    copy.favorite = true;
    copy.calories = 1;
    expect(starterFoods[0].favorite).toBeUndefined();
    expect(starterFoods[0].calories).not.toBe(1);
  });
  it("makes familiar whole foods discoverable instead of only powdered or juice variations", () => {
    for (const name of [
      "Bananas, raw",
      "Apples, raw, with skin",
      "Strawberries, raw",
      "Blueberries, raw",
      "Oranges, raw, all commercial",
      "Avocados, raw, all commercial",
      "Spinach, raw",
      "Carrots, raw",
      "Potatoes, flesh and skin, raw",
      "Broccoli, raw",
      "Tomatoes, red, ripe, raw",
      "Cucumber, with peel, raw",
      "Fish, salmon, Atlantic, wild, cooked",
      "Fish, tuna, light, canned in water",
      "Beans, black, mature seeds, cooked",
      "Lentils, mature seeds, cooked",
      "Nuts, almonds",
    ])
      expect(starterFoods.some((food) => food.name.startsWith(name))).toBe(
        true,
      );
    const banana = starterFoods.find((food) => food.name === "Bananas, raw")!;
    expect(banana.id).toBe("usda-sr-173944");
    expect(banana.calories).toBe(89);
  });
  it("does not assign a USDA link to custom or barcode-only records", () => {
    expect(
      foodSourceUrl({ ...starterFoods[0], id: "custom-food" }),
    ).toBeUndefined();
    expect(
      foodSourceUrl({ ...starterFoods[0], id: "off-1234567890123" }),
    ).toBeUndefined();
    expect(
      foodSourceUrl({ ...starterFoods[0], id: "usda-sr-170894?wrong=1" }),
    ).toBeUndefined();
  });
});
