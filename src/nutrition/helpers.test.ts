import { describe, it, expect } from "vitest";
import type { Food, DiaryEntry, Recipe, AppData } from "../domain/types";
import {
  diaryTotals,
  servingNutrition,
  recipeNutrition,
  recipeFood,
  nutritionCSV,
  freezeDiaryMeal,
  syncRecipeFood,
  syncIngredientRecipes,
} from "./helpers";
const food: Food = {
  id: "food",
  name: "Oats",
  brand: "",
  servingGrams: 40,
  calories: 150,
  protein: 5,
  carbs: 27,
  fat: 3,
  fiber: 4,
  source: "Custom food",
};
const entry: DiaryEntry = {
  id: "entry",
  date: "2026-10-10",
  meal: "Breakfast",
  foodId: food.id,
  food,
  servings: 1.5,
};
describe("portion and diary calculations", () => {
  it("scales fractional servings and fiber with no rounding loss", () => {
    expect(servingNutrition(food, 1.5)).toEqual({
      calories: 225,
      protein: 7.5,
      carbs: 40.5,
      fat: 4.5,
      fiber: 6,
    });
  });
  it("uses the frozen logged food rather than a subsequently edited collection", () => {
    const edited = { ...food, calories: 200 };
    expect(edited.calories).toBe(200);
    expect(diaryTotals([entry]).calories).toBe(225);
  });
  it("rejects negative and nonfinite quantities", () => {
    expect(() => servingNutrition(food, -1)).toThrow();
    expect(() => servingNutrition(food, NaN)).toThrow();
  });
  it("supports empty history without fabricated nutrition", () =>
    expect(diaryTotals([])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    }));
});
describe("recipes", () => {
  const recipe: Recipe = {
    id: "recipe",
    name: "Oat bowls",
    servings: 2,
    ingredients: [{ foodId: food.id, servings: 3 }],
  };
  it("totals ingredient portions then divides by recipe yield", () => {
    expect(recipeNutrition(recipe, [food]).calories).toBe(225);
    expect(recipeFood(recipe, [food]).servingGrams).toBe(60);
  });
  it("rejects missing foods and zero recipe yield", () => {
    expect(() => recipeNutrition(recipe, [])).toThrow(/missing/);
    expect(() => recipeNutrition({ ...recipe, servings: 0 }, [food])).toThrow();
  });
});
it("exports snapshot nutrition and neutralizes spreadsheet formulas", () => {
  const csv = nutritionCSV({
    diary: [{ ...entry, food: { ...food, name: '=HYPERLINK("bad")' } }],
  } as AppData);
  expect(csv).toContain("225");
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain("2026-10-10");
});
it("freezes a saved diary meal instead of using edited collection nutrition", () => {
  const frozen = freezeDiaryMeal([entry], "Breakfast");
  const collection = [{ ...food, calories: 200 }, ...frozen.foods];
  expect(recipeNutrition(frozen.recipe, collection).calories).toBe(225);
  expect(frozen.recipe.ingredients[0].foodId).not.toBe(food.id);
  expect(frozen.foods[0].source).toBe(food.source);
});
it("refreshes a recipe search cache without changing logged snapshot nutrition", () => {
  const recipe: Recipe = {
    id: "r",
    name: "Oats recipe",
    servings: 1,
    ingredients: [{ foodId: food.id, servings: 1 }],
  };
  const data = {
    foods: [{ ...food }],
    recipes: [recipe],
    diary: [],
  } as unknown as AppData;
  const cached = syncRecipeFood(data, recipe);
  data.diary.push({
    ...entry,
    food: structuredClone(cached),
    foodId: cached.id,
    servings: 1,
  });
  data.foods[0].calories = 200;
  syncRecipeFood(data, recipe);
  expect(data.foods.find((f) => f.id === "recipe:r")?.calories).toBe(200);
  expect(diaryTotals(data.diary).calories).toBe(150);
  expect(data.foods.filter((f) => f.id === "recipe:r")).toHaveLength(1);
});
it("refreshes dependent recipe caches after an ingredient food changes", () => {
  const recipe: Recipe = {
    id: "r",
    name: "Oats recipe",
    servings: 1,
    ingredients: [{ foodId: food.id, servings: 1 }],
  };
  const data = {
    foods: [{ ...food }],
    recipes: [recipe],
  } as unknown as AppData;
  syncRecipeFood(data, recipe);
  data.foods[0].calories = 200;
  syncIngredientRecipes(data, food.id);
  expect(data.foods.find((f) => f.id === "recipe:r")?.calories).toBe(200);
});
