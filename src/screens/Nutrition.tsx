import { Select, NumericInput } from "../components/inputs";
import { starterFoods, foodSourceUrl } from "../data/foods";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  ScanLine,
  Star,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Pencil,
  Droplets,
  Utensils,
} from "lucide-react";
import type {
  AppData,
  DiaryEntry,
  Food,
  NutritionTargets,
  Recipe,
} from "../domain/types";
import { addDays, dateKey, formatDate, id } from "../domain/helpers";
import { updateData, useApp } from "../state/store";
import {
  Button,
  Field,
  Sheet,
  SectionHeading,
  Empty,
  IconButton,
  toast,
} from "../components/ui";
import {
  diaryTotals,
  recipeFood,
  recipeNutrition,
  servingNutrition,
  freezeDiaryMeal,
  syncRecipeFood,
  syncIngredientRecipes,
} from "../nutrition/helpers";
import {
  lookupBarcode,
  searchFoodPage,
  scannerSupported,
  startBarcodeScanner,
  extractBarcode,
  savedBarcodeFood,
  FoodLookupError,
  type BarcodeInputFormat,
} from "../integrations/food";

const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "This change could not be saved.";
const round = (n: number) => Math.round(n);
async function change(fn: (data: AppData) => void): Promise<boolean> {
  try {
    await updateData(fn);
    return true;
  } catch (error) {
    toast(errorMessage(error));
    return false;
  }
}
export default function Nutrition({ onBack }: { onBack: () => void }) {
  const { data } = useApp();
  const [day, setDay] = useState(dateKey()),
    [adding, setAdding] = useState(false),
    [addingMeal, setAddingMeal] = useState("Breakfast"),
    [food, setFood] = useState<Food | null>(null),
    [editingFood, setEditingFood] = useState<Food | null>(null),
    [entry, setEntry] = useState<DiaryEntry | null>(null),
    [recipes, setRecipes] = useState(false),
    [targets, setTargets] = useState(false);
  const entries = data.diary.filter((e) => e.date === day),
    totals = diaryTotals(entries),
    water = data.water[day] ?? 0;
  const dailyMeals = [...new Set([...meals, ...entries.map((e) => e.meal)])];
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(day, i - 6);
    return { date, ...diaryTotals(data.diary.filter((e) => e.date === date)) };
  });
  const maxCal = Math.max(
    1,
    ...weekly.map((d) => d.calories),
    data.nutritionTargets.calories,
  );
  const remaining = data.nutritionTargets.calories - totals.calories;
  const beginFood = (meal = "Breakfast") => {
    setAddingMeal(meal);
    setAdding(true);
  };
  const createFood = (draft: Partial<Food> = {}) =>
    setEditingFood({
      id: id(),
      name: "",
      brand: "",
      servingGrams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      ...draft,
      source: "Custom food",
    });
  if (!data.profile.nutrition)
    return (
      <div className="page optional-page nutrition-page">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <header className="page-header">
          <div>
            <p className="eyebrow">An optional part of your day</p>
            <h1>Nutrition</h1>
          </div>
        </header>
        <section className="nutrition-enable">
          <span className="nutrition-enable-icon">
            <Utensils size={30} />
          </span>
          <h2>Nutrition, when you want it.</h2>
          <p className="muted">
            A separate space for the food that fuels you. Add it whenever it
            feels useful; you choose what to track.
          </p>
          <div className="nutrition-enable-features">
            <div>
              <strong>A flexible food diary</strong>
              <p>
                Search products, scan a barcode or enter your own food. Set
                portions that fit your meal.
              </p>
            </div>
            <div>
              <strong>Your recipes & favorites</strong>
              <p>
                Save a meal once. Log it again, with nutrition calculated from
                your ingredients.
              </p>
            </div>
            <div>
              <strong>Water & a little perspective</strong>
              <p>
                Keep a simple water log and see your own daily totals. Targets
                stay editable.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              void change((d) => {
                d.profile.nutrition = true;
              })
            }
          >
            Enable nutrition
          </Button>
          <p className="fine-print">
            No account or subscription. Disable this tool in Settings at any
            time; saved records stay on your device.
          </p>
        </section>
      </div>
    );
  return (
    <div className="page optional-page nutrition-page">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>
      <header className="page-header">
        <div>
          <p className="eyebrow">Daily nourishment</p>
          <h1>Nutrition</h1>
          <p className="muted">A little awareness. A clearer picture.</p>
        </div>
        <Button onClick={() => beginFood()}>
          <Plus size={17} /> Add food
        </Button>
      </header>
      <div className="nutrition-datebar">
        <IconButton
          label="Previous day"
          onClick={() => setDay(addDays(day, -1))}
        >
          <ChevronLeft size={19} />
        </IconButton>
        <div>
          <span className="eyebrow">
            {day === dateKey() ? "Today" : formatDate(day, { weekday: "long" })}
          </span>
          <Field label="Diary date">
            <input
              type="date"
              required
              value={day}
              onChange={(e) => {
                if (e.target.value) setDay(e.target.value);
              }}
            />
          </Field>
        </div>
        <IconButton label="Next day" onClick={() => setDay(addDays(day, 1))}>
          <ChevronRight size={19} />
        </IconButton>
        {day !== dateKey() && (
          <Button variant="ghost" onClick={() => setDay(dateKey())}>
            Today
          </Button>
        )}
      </div>
      <div className="nutrition-layout">
        <div className="nutrition-primary">
          <section className="nutrition-overview">
            <div className="nutrition-energy">
              <div>
                <p className="eyebrow">Energy logged</p>
                <div className="hero-number">
                  {round(totals.calories)} <small>kcal</small>
                </div>
                <p className="muted">
                  {round(Math.abs(remaining))} kcal{" "}
                  {remaining >= 0 ? "remaining" : "above your target"}
                </p>
                <button
                  className="text-btn"
                  aria-label="Edit targets"
                  onClick={() => setTargets(true)}
                >
                  Target {data.nutritionTargets.calories} kcal{" "}
                  <Pencil size={13} />
                </button>
              </div>
            </div>
            <div className="nutrition-macro-grid">
              {(["protein", "carbs", "fat"] as const).map((macro) => (
                <div key={macro}>
                  <p className="eyebrow">
                    {macro === "carbs" ? "Carbohydrate" : macro}
                  </p>
                  <p className="metric">
                    {round(totals[macro])}
                    <small> g</small>
                  </p>
                  <p className="muted">of {data.nutritionTargets[macro]} g</p>
                  <progress
                    value={totals[macro]}
                    max={Math.max(
                      data.nutritionTargets[macro],
                      totals[macro],
                      1,
                    )}
                    aria-label={`${macro} ${round(totals[macro])} grams of ${data.nutritionTargets[macro]}`}
                  />
                </div>
              ))}
            </div>
            <p className="nutrition-fiber muted">
              Fiber logged {Math.round(totals.fiber * 10) / 10} g · incomplete
              fiber values excluded
            </p>
            <progress
              className="nutrition-calorie-progress"
              value={totals.calories}
              max={Math.max(data.nutritionTargets.calories, totals.calories, 1)}
              aria-label={`Calories ${round(totals.calories)} of ${data.nutritionTargets.calories}`}
            />
          </section>
          <section className="nutrition-diary">
            <SectionHeading title="Food diary">
              <span className="muted small">
                {entries.length} item{entries.length === 1 ? "" : "s"}
              </span>
            </SectionHeading>
            {dailyMeals.map((meal) => {
              const list = entries.filter((e) => e.meal === meal),
                mealTotals = diaryTotals(list),
                previous = data.diary.some(
                  (e) => e.date === addDays(day, -1) && e.meal === meal,
                );
              return (
                <section className="nutrition-meal" key={meal}>
                  <div className="nutrition-meal-heading">
                    <h3>{meal}</h3>
                    <span className="muted">
                      {round(mealTotals.calories)} kcal
                    </span>
                    <IconButton
                      label={`Add food to ${meal}`}
                      onClick={() => beginFood(meal)}
                    >
                      <Plus size={17} />
                    </IconButton>
                  </div>
                  {list.length ? (
                    list.map((e) => (
                      <button
                        className="nutrition-food-row"
                        key={e.id}
                        onClick={() => setEntry(e)}
                      >
                        <span>
                          <strong>{e.food.name}</strong>
                          <small>
                            {e.servings} portion{e.servings === 1 ? "" : "s"} ·{" "}
                            {round(e.food.servingGrams * e.servings)} g
                            {e.food.brand ? ` · ${e.food.brand}` : ""}
                          </small>
                        </span>
                        <span>
                          {round(e.food.calories * e.servings)}
                          <small>kcal</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <button
                      className="nutrition-meal-empty"
                      onClick={() => beginFood(meal)}
                    >
                      Add something to your {meal.toLowerCase()}
                    </button>
                  )}
                  {(previous || list.length > 0) && (
                    <div className="nutrition-meal-actions">
                      {previous && (
                        <button
                          className="text-btn"
                          onClick={() =>
                            void change((d) => {
                              d.diary.push(
                                ...d.diary
                                  .filter(
                                    (e) =>
                                      e.date === addDays(day, -1) &&
                                      e.meal === meal,
                                  )
                                  .map((e) => ({ ...e, id: id(), date: day })),
                              );
                            }).then((ok) => {
                              if (ok)
                                toast(
                                  `Copied yesterday’s ${meal.toLowerCase()}`,
                                );
                            })
                          }
                        >
                          <Copy size={13} /> Copy yesterday
                        </button>
                      )}
                      {list.length > 0 && (
                        <button
                          className="text-btn"
                          onClick={() => {
                            const frozen = freezeDiaryMeal(
                              list,
                              `${meal} · ${formatDate(day)}`,
                            );
                            void change((d) => {
                              d.foods.push(...frozen.foods);
                              d.recipes.push(frozen.recipe);
                              syncRecipeFood(d, frozen.recipe);
                            }).then((ok) => {
                              if (ok) toast("Saved meal to recipes");
                            });
                          }}
                        >
                          Save meal
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        </div>
        <aside className="nutrition-secondary" aria-label="Nutrition tools">
          <section className="nutrition-collection">
            <p className="eyebrow">Keep your favorites close</p>
            <h2>Your food collection</h2>
            <p className="muted">
              {data.foods.length} saved foods · {data.recipes.length} recipes &
              meals
            </p>
            <Button variant="secondary" onClick={() => setRecipes(true)}>
              Recipes & saved meals <ChevronRight size={15} />
            </Button>
            <button
              className="text-btn"
              onClick={() => {
                setAddingMeal("Breakfast");
                createFood();
              }}
            >
              <Plus size={14} /> Create custom food
            </button>
          </section>
          <section className="nutrition-water">
            <SectionHeading title="Water">
              <Droplets size={19} />
            </SectionHeading>
            <div className="nutrition-water-total">
              <span className="metric">
                {(water / 1000).toFixed(2)}
                <small> L</small>
              </span>
              <span className="muted">
                of {(data.nutritionTargets.waterMl / 1000).toFixed(1)} L
              </span>
            </div>
            <div className="nutrition-water-actions">
              <Button
                variant="secondary"
                disabled={water === 0}
                onClick={() =>
                  void change((d) => {
                    d.water[day] = Math.max(0, (d.water[day] ?? 0) - 250);
                  })
                }
              >
                −250 ml
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void change((d) => {
                    d.water[day] = Math.min(20000, (d.water[day] ?? 0) + 250);
                  })
                }
              >
                +250 ml
              </Button>
            </div>
            <details className="nutrition-adjust-water">
              <summary>Adjust total</summary>
              <Field label="Total water (ml)">
                <NumericInput
                  min={0}
                  max={20000}
                  step={50}
                  value={water}
                  onChange={(e) =>
                    void change((d) => {
                      d.water[day] = Math.min(
                        20000,
                        Math.max(0, Number(e.target.value)),
                      );
                    })
                  }
                />
              </Field>
            </details>
          </section>
          <section className="nutrition-trends">
            <SectionHeading title="Past seven days" />
            <div className="nutrition-trend-chart">
              {weekly.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setDay(d.date)}
                  aria-label={`${formatDate(d.date)}: ${round(d.calories)} calories, view diary`}
                  className={d.date === day ? "selected" : ""}
                >
                  <span>{round(d.calories)}</span>
                  <i
                    style={{ height: Math.max(2, (d.calories / maxCal) * 85) }}
                  />
                  <small>{formatDate(d.date, { weekday: "short" })}</small>
                </button>
              ))}
            </div>
            <p className="fine-print">
              Logged energy, not estimated expenditure. Tap a day to view its
              diary.
            </p>
          </section>
          <p className="fine-print nutrition-attribution">
            Targets are editable personal inputs. Food records are estimates.{" "}
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
            >
              Open Food Facts
            </a>{" "}
            data · ODbL / DbCL. Your saved collection works offline.
          </p>
        </aside>
      </div>
      {adding && (
        <FoodSearch
          data={data}
          onClose={() => setAdding(false)}
          onSelect={(f) => {
            setFood(f);
            setAdding(false);
          }}
          onCustom={(draft) => {
            createFood(draft);
            setAdding(false);
          }}
          onEdit={(f) => {
            setAdding(false);
            setEditingFood(f);
          }}
        />
      )}
      {food && (
        <PortionEditor
          food={food}
          day={day}
          defaultMeal={addingMeal}
          onClose={() => setFood(null)}
        />
      )}
      {entry && (
        <PortionEditor
          food={entry.food}
          entry={entry}
          day={day}
          onClose={() => setEntry(null)}
        />
      )}
      {editingFood && (
        <FoodEditor
          food={editingFood}
          onClose={() => setEditingFood(null)}
          onSaved={(f) => {
            setEditingFood(null);
            setFood(f);
          }}
        />
      )}
      {recipes && (
        <RecipeList
          data={data}
          onClose={() => setRecipes(false)}
          onSelect={(f) => {
            setRecipes(false);
            setAddingMeal("Breakfast");
            setFood(f);
          }}
        />
      )}
      {targets && (
        <TargetsEditor
          targets={data.nutritionTargets}
          onClose={() => setTargets(false)}
        />
      )}
    </div>
  );
}
function FoodSearch({
  data,
  onClose,
  onSelect,
  onCustom,
  onEdit,
}: {
  data: AppData;
  onClose: () => void;
  onSelect: (f: Food) => void;
  onCustom: (draft?: Partial<Food>) => void;
  onEdit: (f: Food) => void;
}) {
  const [term, setTerm] = useState(""),
    [barcode, setBarcode] = useState(""),
    [remote, setRemote] = useState<Food[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [scan, setScan] = useState(false);
  const [barcodeFormat, setBarcodeFormat] =
    useState<BarcodeInputFormat>("auto");
  const [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [searchedTerm, setSearchedTerm] = useState(""),
    [omitted, setOmitted] = useState(0);
  const [unknown, setUnknown] = useState<Partial<Food> | undefined>();
  const [localPage, setLocalPage] = useState(1);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const filterTerm = (value: string) => {
    request.current++;
    setTerm(value);
    setRemote([]);
    setPage(0);
    setHasMore(false);
    setSearchedTerm("");
    setOmitted(0);
    setError("");
    setLocalPage(1);
  };
  const savedIds = new Set(data.foods.map((food) => food.id));
  const collection = [
    ...data.foods,
    ...starterFoods.filter((food) => !savedIds.has(food.id)),
  ];
  const cached = collection
    .filter((f) =>
      `${f.name} ${f.brand} ${f.barcode ?? ""}`
        .toLowerCase()
        .includes(term.toLowerCase()),
    )
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
  const results = [
    ...cached,
    ...remote.filter((f) => !cached.some((c) => c.id === f.id)),
  ];
  const visibleResults = results.slice((localPage - 1) * 40, localPage * 40);
  const lookup = async (
    type: "barcode" | "search",
    value: string,
    requestedPage = 1,
    format = barcodeFormat,
  ) => {
    const token = ++request.current;
    setBusy(true);
    setError("");
    setUnknown(undefined);
    try {
      const cached =
        type === "barcode"
          ? savedBarcodeFood(data.foods, value, format)
          : undefined;
      if (cached) {
        onSelect(cached);
        return;
      }
      const result =
        type === "search"
          ? await searchFoodPage(value, requestedPage)
          : undefined;
      const foods = result
        ? result.foods
        : [await lookupBarcode(value, format)];
      if (request.current !== token) return;
      setRemote((previous) =>
        requestedPage > 1
          ? [
              ...new Map(
                [...previous, ...foods].map((food) => [food.id, food]),
              ).values(),
            ]
          : foods,
      );
      if (result) {
        setPage(result.page);
        setHasMore(result.hasMore);
        setSearchedTerm(value);
        setOmitted((previous) =>
          requestedPage > 1 ? previous + result.omitted : result.omitted,
        );
      }
      if (!foods.length)
        setError(
          "No complete food records found. Add a custom food from the package label.",
        );
      await updateData((d) => {
        for (const f of foods)
          if (!d.foods.some((saved) => saved.id === f.id)) d.foods.push(f);
      });
      if (type === "barcode" && foods[0]) onSelect(foods[0]);
    } catch (e) {
      if (request.current !== token) return;
      setError(errorMessage(e));
      if (type === "barcode")
        setUnknown({
          barcode: extractBarcode(value, format) ?? value.trim(),
          name:
            e instanceof FoodLookupError
              ? e.product?.product_name?.trim() ||
                e.product?.product_name_en?.trim() ||
                ""
              : "",
          brand: e instanceof FoodLookupError ? (e.product?.brands ?? "") : "",
        });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Find food" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup("search", term);
        }}
      >
        <Field
          label="Search your collection"
          hint="Includes an offline USDA generic-food library. Generic foods are separate from branded package products."
        >
          <input
            placeholder="Food, brand or barcode"
            value={term}
            onChange={(e) => filterTerm(e.target.value)}
          />
        </Field>
        <Button
          variant="secondary"
          type="submit"
          disabled={busy || term.trim().length < 2}
        >
          <Search size={16} /> {busy ? "Searching…" : "Search Open Food Facts"}
        </Button>
      </form>
      <p className="muted">
        Your collection and generic foods filter instantly and work offline.
        Online search is sent only when you tap Search.
      </p>
      <div className="chip-row" aria-label="Food discovery ideas">
        {[
          "Snacks",
          "Chocolate",
          "Chips",
          "Biscuits",
          "Protein bars",
          "Yogurt",
          "Fruit",
        ].map((label) => (
          <button
            type="button"
            className="chip"
            key={label}
            onClick={() => filterTerm(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup("barcode", barcode);
        }}
      >
        <Field label="Barcode or supported product URL">
          <input
            value={barcode}
            onChange={(e) => {
              request.current++;
              setBarcode(e.target.value);
              setError("");
              setUnknown(undefined);
            }}
            placeholder="EAN / UPC"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Button
          variant="secondary"
          type="submit"
          disabled={busy || !barcode.trim()}
        >
          Look up
        </Button>
      </form>
      <Field
        label="Barcode format"
        hint="Auto handles EAN/UPC and zero padding. Choose UPC-E for an eight-digit compressed UPC if it is not recognized."
      >
        <Select
          value={barcodeFormat}
          onChange={(event) =>
            setBarcodeFormat(event.target.value as BarcodeInputFormat)
          }
        >
          <option value="auto">Auto · EAN / UPC / GTIN</option>
          <option value="upc_e">UPC-E · compressed UPC</option>
        </Select>
      </Field>
      <Button variant="ghost" onClick={() => setScan(true)}>
        <ScanLine size={16} /> Scan with camera
      </Button>
      {error && (
        <p role="alert" className="muted">
          {error}
        </p>
      )}
      {unknown && (
        <Button variant="secondary" onClick={() => onCustom(unknown)}>
          <Plus size={16} /> Save this barcode from its label
        </Button>
      )}
      {omitted > 0 && (
        <p className="fine-print">
          {omitted} products have incomplete required nutrition. More results
          may be available; you can also enter the package label.
        </p>
      )}
      <div className="stack section">
        {results.length ? (
          visibleResults.map((f) => (
            <div className="list-row" key={f.id}>
              <button
                className="btn ghost"
                style={{ flex: 1, textAlign: "left", justifyContent: "start" }}
                onClick={() => onSelect(f)}
              >
                <div>
                  <strong>{f.name}</strong>
                  <p className="muted">
                    {f.brand ? `${f.brand} · ` : ""}
                    {round(f.calories)} kcal / {f.servingGrams} g
                  </p>
                  <p className="fine-print">
                    {f.source.startsWith("USDA")
                      ? "USDA generic food · package values may differ"
                      : f.source}
                  </p>
                </div>
              </button>
              <IconButton
                label={`${f.favorite ? "Unfavorite" : "Favorite"} ${f.name}`}
                onClick={() =>
                  void change((d) => {
                    const saved = d.foods.find((x) => x.id === f.id);
                    if (saved) saved.favorite = !saved.favorite;
                    else d.foods.push({ ...f, favorite: true });
                  })
                }
              >
                <Star size={17} fill={f.favorite ? "currentColor" : "none"} />
              </IconButton>
              <IconButton label={`Edit ${f.name}`} onClick={() => onEdit(f)}>
                <Pencil size={16} />
              </IconButton>
            </div>
          ))
        ) : (
          <Empty
            title="Build your collection"
            description="Create your own food or search for a packaged product."
          />
        )}
        {results.length > 40 && (
          <div className="row" aria-label="Food result pages">
            <Button
              variant="secondary"
              disabled={localPage === 1}
              onClick={() => setLocalPage((value) => value - 1)}
            >
              Previous foods
            </Button>
            <span className="small muted">
              {(localPage - 1) * 40 + 1}–
              {Math.min(localPage * 40, results.length)} of {results.length}
            </span>
            <Button
              variant="secondary"
              disabled={localPage * 40 >= results.length}
              onClick={() => setLocalPage((value) => value + 1)}
            >
              Next foods
            </Button>
          </div>
        )}
        {hasMore && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void lookup("search", searchedTerm, page + 1)}
          >
            {busy ? "Loading…" : "Load more products"}
          </Button>
        )}
        <Button onClick={() => onCustom()}>
          <Plus size={16} /> Create custom food
        </Button>
      </div>
      {scan && (
        <Scanner
          onClose={() => setScan(false)}
          onCode={(code) => {
            setScan(false);
            setBarcode(code);
            void lookup("barcode", code, 1, "auto");
          }}
        />
      )}
    </Sheet>
  );
}
function Scanner({
  onClose,
  onCode,
}: {
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(
    scannerSupported()
      ? ""
      : "Camera scanning needs HTTPS and a supported camera browser. Enter the barcode manually.",
  );
  const callback = useRef(onCode);
  useEffect(() => {
    callback.current = onCode;
  }, [onCode]);
  useEffect(() => {
    let cleanup: (() => void) | undefined,
      cancelled = false;
    if (video.current)
      void startBarcodeScanner(
        video.current,
        (code) => {
          if (!cancelled) callback.current(code);
        },
        (message) => {
          if (!cancelled) setError(message);
        },
      )
        .then((stop) => {
          if (cancelled) stop();
          else cleanup = stop;
        })
        .catch((e) => {
          if (!cancelled) setError(errorMessage(e));
        });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  return (
    <Sheet title="Scan product barcode" onClose={onClose}>
      <p className="muted">
        Point the rear camera at an EAN, UPC or supported GS1 product code.
        Camera frames stay on your device. Only a detected identifier goes to
        the food database.
      </p>
      {scannerSupported() && (
        <video
          ref={video}
          muted
          playsInline
          style={{
            width: "100%",
            maxHeight: 340,
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
      <Button variant="secondary" onClick={onClose}>
        Return to manual barcode entry
      </Button>
    </Sheet>
  );
}
function FoodEditor({
  food,
  onClose,
  onSaved,
}: {
  food: Food;
  onClose: () => void;
  onSaved: (f: Food) => void;
}) {
  const { data } = useApp();
  type FoodDraft = Omit<Food, "calories" | "protein" | "carbs" | "fat"> &
    Partial<Pick<Food, "calories" | "protein" | "carbs" | "fat">>;
  const [f, setF] = useState<FoodDraft>(() => ({
    ...food,
    ...(!data.foods.some((saved) => saved.id === food.id) &&
    food.source === "Custom food"
      ? {
          calories: undefined,
          protein: undefined,
          carbs: undefined,
          fat: undefined,
        }
      : {}),
  }));
  const [foodError, setFoodError] = useState("");
  const numeric = (
    key: "servingGrams" | "calories" | "protein" | "carbs" | "fat" | "fiber",
    value: string,
  ) =>
    setF({
      ...f,
      [key]: value === "" && key !== "servingGrams" ? undefined : Number(value),
    });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !f.name.trim() ||
      !(f.servingGrams > 0) ||
      [f.calories, f.protein, f.carbs, f.fat].some(
        (value) =>
          typeof value !== "number" || !Number.isFinite(value) || value < 0,
      )
    ) {
      setFoodError(
        "Enter the food name, a positive reference portion and every required nutrient from its label. Zero is valid when the label states zero.",
      );
      return;
    }
    const complete: Food = {
      ...f,
      name: f.name.trim(),
      calories: f.calories!,
      protein: f.protein!,
      carbs: f.carbs!,
      fat: f.fat!,
      barcode: f.barcode
        ? (extractBarcode(f.barcode) ?? f.barcode.trim())
        : undefined,
    };
    if (
      await change((d) => {
        const index = d.foods.findIndex((x) => x.id === f.id);
        if (index >= 0) d.foods[index] = complete;
        else d.foods.push(complete);
        syncIngredientRecipes(d, f.id);
      })
    ) {
      toast("Food saved");
      onSaved(complete);
    }
  };
  return (
    <Sheet
      title={
        food.source === "Custom food" &&
        !data.foods.some((saved) => saved.id === food.id)
          ? "Create custom food"
          : "Edit food"
      }
      onClose={onClose}
    >
      <form className="stack" onSubmit={(e) => void submit(e)}>
        {food.source === "Custom food" && (
          <p className="muted">
            Enter the values printed on your package for the reference portion.
            Required nutrients stay blank until entered; optional fiber can be
            omitted.
          </p>
        )}
        {foodError && <p role="alert">{foodError}</p>}
        <Field label="Food name">
          <input
            required
            value={f.name}
            maxLength={200}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Brand">
          <input
            value={f.brand}
            onChange={(e) => setF({ ...f, brand: e.target.value })}
          />
        </Field>
        <Field
          label="Reference portion (grams)"
          hint="All nutrient values below describe this portion. Use 100 g for values printed per 100 g."
        >
          <NumericInput
            required
            min="0.1"
            max="10000"
            step="0.1"
            value={f.servingGrams}
            onChange={(e) => numeric("servingGrams", e.target.value)}
          />
        </Field>
        <div className="grid-2">
          {(
            [
              ["calories", "Calories (kcal)"],
              ["protein", "Protein (g)"],
              ["carbs", "Carbohydrate (g)"],
              ["fat", "Fat (g)"],
              ["fiber", "Fiber (g), optional"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <NumericInput
                required={key !== "fiber"}
                min="0"
                max={key === "calories" ? 100000 : 10000}
                step="0.1"
                value={f[key] ?? ""}
                onChange={(e) => numeric(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <Field label="Barcode, optional">
          <input
            inputMode="numeric"
            value={f.barcode ?? ""}
            onChange={(e) => setF({ ...f, barcode: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={f.notes ?? ""}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        <p className="muted">
          {f.source}. Editing a food does not change previously logged diary
          nutrition.
        </p>
        <Button type="submit">Save food</Button>
        {data.foods.some((x) => x.id === f.id) && (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (
                data.recipes.some((r) =>
                  r.ingredients.some((i) => i.foodId === f.id),
                )
              ) {
                toast(
                  "This food is used in a recipe. Remove it from those recipes first.",
                );
                return;
              }
              if (
                confirm(
                  "Remove this food from your collection? Existing diary entries keep their saved nutrition.",
                )
              )
                void change((d) => {
                  d.foods = d.foods.filter((x) => x.id !== f.id);
                }).then((ok) => {
                  if (ok) onClose();
                });
            }}
          >
            Remove from collection
          </Button>
        )}
      </form>
    </Sheet>
  );
}
function PortionEditor({
  food,
  entry,
  day,
  defaultMeal = "Breakfast",
  onClose,
}: {
  food: Food;
  entry?: DiaryEntry;
  day: string;
  defaultMeal?: string;
  onClose: () => void;
}) {
  const [servings, setServings] = useState(entry?.servings ?? 1),
    [meal, setMeal] = useState(entry?.meal ?? defaultMeal),
    [date, setDate] = useState(entry?.date ?? day),
    [custom, setCustom] = useState("");
  const nutrition = servingNutrition(food, Math.max(0, servings));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(servings) || servings <= 0) {
      toast("Enter a portion greater than zero.");
      return;
    }
    const next: DiaryEntry = {
      id: entry?.id ?? id(),
      foodId: food.id,
      food: structuredClone(food),
      date,
      meal: meal === "Custom" ? custom.trim() : meal,
      servings,
    };
    if (!next.meal) {
      toast("Enter a meal name.");
      return;
    }
    if (
      await change((d) => {
        if (!d.foods.some((f) => f.id === food.id)) d.foods.push(food);
        const index = d.diary.findIndex((e) => e.id === next.id);
        if (index >= 0) d.diary[index] = next;
        else d.diary.push(next);
      })
    ) {
      toast(entry ? "Diary entry updated" : "Food logged");
      onClose();
    }
  };
  return (
    <Sheet title={entry ? "Edit diary entry" : "Log food"} onClose={onClose}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <h3>{food.name}</h3>
        <p className="muted">
          {food.brand} · {food.source}
        </p>
        {food.notes && <p className="fine-print">{food.notes}</p>}
        {foodSourceUrl(food) && (
          <a
            className="text-btn"
            href={foodSourceUrl(food)}
            target="_blank"
            rel="noreferrer"
          >
            View USDA source record
          </a>
        )}
        <div className="grid-2">
          <Field
            label="Portions"
            hint={`One portion = ${Math.round(food.servingGrams * 10) / 10} g`}
          >
            <NumericInput
              required
              min="0.01"
              max="1000"
              step="0.01"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </Field>
          <Field label="Or total grams">
            <NumericInput
              required
              min="0.1"
              max="100000"
              step="0.1"
              value={Math.round(servings * food.servingGrams * 10) / 10}
              onChange={(e) =>
                setServings(Number(e.target.value) / food.servingGrams)
              }
            />
          </Field>
        </div>
        <p className="metric">
          {round(nutrition.calories)} <small>kcal</small>
        </p>
        <p className="muted">
          {round(nutrition.protein)} g protein · {round(nutrition.carbs)} g
          carbs · {round(nutrition.fat)} g fat
        </p>
        <Field label="Meal">
          <Select value={meal} onChange={(e) => setMeal(e.target.value)}>
            {[
              ...new Set([...meals, ...(entry ? [entry.meal] : []), "Custom"]),
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        {meal === "Custom" && (
          <Field label="Custom meal name">
            <input
              required
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={100}
            />
          </Field>
        )}
        <Field label="Date">
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Button type="submit">{entry ? "Save changes" : "Add to diary"}</Button>
        {entry && (
          <div className="toolbar">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void change((d) => {
                  d.diary.push({ ...entry, id: id() });
                }).then((ok) => {
                  if (ok) {
                    toast("Entry duplicated");
                    onClose();
                  }
                })
              }
            >
              <Copy size={16} /> Duplicate
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                void change((d) => {
                  d.diary = d.diary.filter((e) => e.id !== entry.id);
                }).then((ok) => {
                  if (ok) {
                    toast("Entry removed");
                    onClose();
                  }
                })
              }
            >
              <Trash2 size={16} /> Remove
            </Button>
          </div>
        )}
        <p className="muted">
          Changing the meal or date moves this entry. Logged nutrition uses a
          snapshot of this food.
        </p>
      </form>
    </Sheet>
  );
}
function RecipeList({
  data,
  onClose,
  onSelect,
}: {
  data: AppData;
  onClose: () => void;
  onSelect: (food: Food) => void;
}) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  return (
    <Sheet title="Recipes & saved meals" onClose={onClose}>
      <p className="muted">
        Build a recipe from saved foods, set its yield, then log any portion. A
        saved meal uses one serving for the whole meal.
      </p>
      <div className="stack">
        {data.recipes.map((r) => {
          let food: Food;
          try {
            food = recipeFood(r, data.foods);
          } catch {
            return (
              <p className="muted" key={r.id}>
                {r.name}: ingredient unavailable.{" "}
                <Button
                  variant="ghost"
                  onClick={() => setRecipe(structuredClone(r))}
                >
                  Edit recipe
                </Button>
              </p>
            );
          }
          return (
            <div className="list-row" key={r.id}>
              <button
                className="btn ghost"
                style={{ textAlign: "left", flex: 1, justifyContent: "start" }}
                onClick={() => onSelect(food)}
              >
                <div>
                  <strong>{r.name}</strong>
                  <p className="muted">
                    {round(food.calories)} kcal / serving · makes {r.servings}
                  </p>
                </div>
              </button>
              <IconButton
                label={`Edit ${r.name}`}
                onClick={() => setRecipe(structuredClone(r))}
              >
                <Pencil size={16} />
              </IconButton>
            </div>
          );
        })}
        {!data.recipes.length && (
          <Empty
            title="Keep your favorites close"
            description="Build your first recipe or save a logged meal."
          />
        )}
        <Button
          onClick={() =>
            setRecipe({ id: id(), name: "", servings: 1, ingredients: [] })
          }
        >
          <Plus size={16} /> Create recipe
        </Button>
      </div>
      {recipe && (
        <RecipeEditor
          value={recipe}
          data={data}
          onClose={() => setRecipe(null)}
        />
      )}
    </Sheet>
  );
}
function RecipeEditor({
  value,
  data,
  onClose,
}: {
  value: Recipe;
  data: AppData;
  onClose: () => void;
}) {
  const [r, setR] = useState(value),
    [ingredient, setIngredient] = useState(data.foods[0]?.id ?? ""),
    [quantity, setQuantity] = useState(1);
  let totals;
  try {
    totals = recipeNutrition(r, data.foods);
  } catch {
    totals = null;
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!r.ingredients.length) {
      toast("Add at least one ingredient.");
      return;
    }
    if (r.ingredients.some((i) => i.foodId === `recipe:${r.id}`)) {
      toast("A recipe cannot contain itself. Remove that ingredient.");
      return;
    }
    if (
      await change((d) => {
        const index = d.recipes.findIndex((x) => x.id === r.id);
        if (index >= 0) d.recipes[index] = r;
        else d.recipes.push(r);
        syncRecipeFood(d, r);
        syncIngredientRecipes(d, `recipe:${r.id}`);
      })
    ) {
      toast("Recipe saved");
      onClose();
    }
  };
  return (
    <Sheet title="Recipe editor" onClose={onClose}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <Field label="Recipe or meal name">
          <input
            required
            value={r.name}
            onChange={(e) => setR({ ...r, name: e.target.value })}
          />
        </Field>
        <Field label="Recipe yield (servings)">
          <NumericInput
            required
            min="0.1"
            max="1000"
            step="0.1"
            value={r.servings}
            onChange={(e) => setR({ ...r, servings: Number(e.target.value) })}
          />
        </Field>
        {r.ingredients.map((i, index) => (
          <div className="list-row" key={`${index}:${i.foodId}`}>
            <div style={{ flex: 1 }}>
              <strong>
                {data.foods.find((f) => f.id === i.foodId)?.name ??
                  "Missing ingredient"}
              </strong>
              <Field label="Ingredient portions">
                <NumericInput
                  required
                  min="0.01"
                  max="1000"
                  step="0.01"
                  value={i.servings}
                  onChange={(e) =>
                    setR({
                      ...r,
                      ingredients: r.ingredients.map((item, n) =>
                        n === index
                          ? { ...item, servings: Number(e.target.value) }
                          : item,
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <IconButton
              label="Remove ingredient"
              type="button"
              onClick={() =>
                setR({
                  ...r,
                  ingredients: r.ingredients.filter((_, n) => n !== index),
                })
              }
            >
              <Trash2 size={17} />
            </IconButton>
          </div>
        ))}
        {data.foods.length > 0 ? (
          <>
            <Field label="Ingredient from your collection">
              <Select
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
              >
                {data.foods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.servingGrams} g / portion)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ingredient quantity (portions)">
              <NumericInput
                min="0.01"
                max="1000"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={
                !ingredient || quantity <= 0 || !Number.isFinite(quantity)
              }
              onClick={() =>
                setR({
                  ...r,
                  ingredients: [
                    ...r.ingredients,
                    { foodId: ingredient, servings: quantity },
                  ],
                })
              }
            >
              Add ingredient
            </Button>
          </>
        ) : (
          <p className="muted">
            Create or find foods before building your recipe.
          </p>
        )}
        {totals && (
          <p className="muted">
            Per serving: {round(totals.calories)} kcal · {round(totals.protein)}{" "}
            g protein · {round(totals.carbs)} g carbs · {round(totals.fat)} g
            fat
          </p>
        )}
        <Button type="submit">Save recipe</Button>
        {data.recipes.some((x) => x.id === r.id) && (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (
                data.recipes.some(
                  (recipe) =>
                    recipe.id !== r.id &&
                    recipe.ingredients.some(
                      (ingredient) => ingredient.foodId === `recipe:${r.id}`,
                    ),
                )
              ) {
                toast(
                  "This recipe is used in another recipe. Remove it from those ingredients first.",
                );
                return;
              }
              if (
                confirm(
                  "Remove this saved recipe? Diary entries keep their recorded nutrition.",
                )
              )
                void change((d) => {
                  d.recipes = d.recipes.filter((x) => x.id !== r.id);
                  d.foods = d.foods.filter(
                    (food) => food.id !== `recipe:${r.id}`,
                  );
                }).then((ok) => {
                  if (ok) onClose();
                });
            }}
          >
            Remove recipe
          </Button>
        )}
      </form>
    </Sheet>
  );
}
function TargetsEditor({
  targets,
  onClose,
}: {
  targets: NutritionTargets;
  onClose: () => void;
}) {
  const [t, setT] = useState({ ...targets });
  return (
    <Sheet title="Personal nutrition targets" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void change((d) => {
            d.nutritionTargets = t;
          }).then((ok) => {
            if (ok) {
              toast("Targets saved");
              onClose();
            }
          });
        }}
      >
        <p className="muted">
          Enter targets that fit your needs. These are personal preferences, not
          a prescribed diet or exact measure of your requirements.
        </p>
        {(
          [
            ["calories", "Daily energy (kcal)"],
            ["protein", "Protein (g)"],
            ["carbs", "Carbohydrate (g)"],
            ["fat", "Fat (g)"],
            ["waterMl", "Water (ml)"],
          ] as const
        ).map(([key, label]) => (
          <Field label={label} key={key}>
            <NumericInput
              required
              min="0"
              max={
                key === "waterMl" ? 20000 : key === "calories" ? 20000 : 2000
              }
              value={t[key]}
              onChange={(e) => setT({ ...t, [key]: Number(e.target.value) })}
            />
          </Field>
        ))}
        <Button type="submit">Save targets</Button>
      </form>
    </Sheet>
  );
}
