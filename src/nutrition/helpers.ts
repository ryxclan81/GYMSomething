import type { AppData, DiaryEntry, Food, Recipe } from "../domain/types";
import { id } from "../domain/helpers";
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
export const emptyNutrients = (): Nutrients => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
});
export function servingNutrition(food: Food, servings: number): Nutrients {
  if (!Number.isFinite(servings) || servings < 0)
    throw new Error("Portions must be a non-negative number.");
  return {
    calories: food.calories * servings,
    protein: food.protein * servings,
    carbs: food.carbs * servings,
    fat: food.fat * servings,
    fiber: (food.fiber ?? 0) * servings,
  };
}
export function diaryTotals(entries: DiaryEntry[]): Nutrients {
  return entries.reduce((sum, entry) => {
    const n = servingNutrition(entry.food, entry.servings);
    for (const key of Object.keys(sum) as (keyof Nutrients)[])
      sum[key] += n[key];
    return sum;
  }, emptyNutrients());
}
export function recipeNutrition(recipe: Recipe, foods: Food[]): Nutrients {
  if (!Number.isFinite(recipe.servings) || recipe.servings <= 0)
    throw new Error("A recipe must make at least one positive serving.");
  return recipe.ingredients.reduce((sum, ingredient) => {
    const food = foods.find((f) => f.id === ingredient.foodId);
    if (!food)
      throw new Error(
        "A recipe ingredient is missing. Restore the food or edit this recipe.",
      );
    const n = servingNutrition(food, ingredient.servings / recipe.servings);
    for (const key of Object.keys(sum) as (keyof Nutrients)[])
      sum[key] += n[key];
    return sum;
  }, emptyNutrients());
}
export function recipeFood(recipe: Recipe, foods: Food[]): Food {
  const totals = recipeNutrition(recipe, foods),
    grams =
      recipe.ingredients.reduce(
        (sum, i) =>
          sum +
          (foods.find((f) => f.id === i.foodId)?.servingGrams ?? 0) *
            i.servings,
        0,
      ) / recipe.servings;
  return {
    id: `recipe:${recipe.id}`,
    name: recipe.name,
    brand: "Your recipe",
    servingGrams: grams,
    ...totals,
    source: "Local recipe",
  };
}
/** A saved diary meal retains the nutrition that was actually logged, even after collection edits. */
export function freezeDiaryMeal(
  entries: DiaryEntry[],
  name: string,
): { recipe: Recipe; foods: Food[] } {
  if (!entries.length) throw new Error("Log foods before saving a meal.");
  const recipeId = id();
  const foods = entries.map((entry, index) => ({
    ...structuredClone(entry.food),
    id: `meal:${recipeId}:${index}`,
    favorite: false,
  }));
  return {
    recipe: {
      id: recipeId,
      name,
      servings: 1,
      ingredients: entries.map((entry, index) => ({
        foodId: foods[index].id,
        servings: entry.servings,
      })),
    },
    foods,
  };
}
/** Recalculate the searchable recipe food while preserving frozen foods in existing diary entries. */
export function syncRecipeFood(data: AppData, recipe: Recipe): Food {
  const food = recipeFood(recipe, data.foods),
    index = data.foods.findIndex((f) => f.id === food.id);
  if (index >= 0)
    data.foods[index] = { ...food, favorite: data.foods[index].favorite };
  else data.foods.push(food);
  return food;
}
/** Keep cached recipes current after a saved ingredient is edited; existing diary snapshots stay frozen. */
export function syncIngredientRecipes(data: AppData, foodId: string): void {
  const pending = [foodId],
    updated = new Set<string>();
  while (pending.length) {
    const changed = pending.shift()!;
    for (const recipe of data.recipes) {
      if (
        updated.has(recipe.id) ||
        !recipe.ingredients.some((i) => i.foodId === changed)
      )
        continue;
      updated.add(recipe.id);
      pending.push(syncRecipeFood(data, recipe).id);
    }
  }
}
/** Protect spreadsheet consumers against CSV formula execution, preserve actual values otherwise. */
function cell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function csv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
export function nutritionCSV(data: AppData): string {
  return csv([
    [
      "date",
      "meal",
      "food",
      "brand",
      "portions",
      "grams",
      "calories_kcal",
      "protein_g",
      "carbs_g",
      "fat_g",
      "fiber_g",
      "source",
    ],
    ...data.diary.map((e) => {
      const n = servingNutrition(e.food, e.servings);
      return [
        e.date,
        e.meal,
        e.food.name,
        e.food.brand,
        e.servings,
        e.food.servingGrams * e.servings,
        n.calories,
        n.protein,
        n.carbs,
        n.fat,
        n.fiber,
        e.food.source,
      ];
    }),
  ]);
}
export function workoutCSV(data: AppData): string {
  return csv([
    [
      "session_id",
      "started_at",
      "completed_at",
      "workout",
      "exercise",
      "original_exercise_id",
      "set_type",
      "completed",
      "skipped",
      "weight_kg",
      "reps",
      "duration_seconds",
      "distance_km",
      "rir",
      "rpe",
      "notes",
    ],
    ...data.sessions.flatMap((session) =>
      session.exercises.flatMap((exercise) =>
        exercise.sets.map((set) => [
          session.id,
          session.startedAt,
          session.completedAt,
          session.name,
          exercise.exercise.name,
          exercise.originalExerciseId,
          set.type,
          set.completed,
          set.skipped,
          set.weightKg,
          set.reps,
          set.durationSeconds,
          set.distanceKm,
          set.rir,
          set.rpe,
          set.note ?? "",
        ]),
      ),
    ),
  ]);
}
export function downloadFile(
  text: string,
  name: string,
  type = "application/json",
): void {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
