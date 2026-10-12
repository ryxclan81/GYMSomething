import type { Food } from "../domain/types";
interface NutrientValue {
  value?: number | string;
  unit?: string;
  source?: string;
  modifier?: string;
}
interface NutrientSet {
  per?: "100g" | "100ml" | "serving";
  per_quantity?: number;
  per_unit?: string;
  preparation?: string;
  source?: string;
  nutrients?: Record<string, NutrientValue>;
}
export interface Product {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  generic_name?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string>;
  nutrition?: { aggregated_set?: NutrientSet; input_sets?: NutrientSet[] };
}
const fields =
  "code,product_name,product_name_en,generic_name,brands,nutriments,nutrition,serving_quantity,serving_quantity_unit,serving_size";
let lastSearch: number | undefined, lastProduct: number | undefined;
const identifier = "Setwise/1.4 (local-first personal fitness app)";
function value(
  record: Record<string, number | string>,
  key: string,
): number | undefined {
  const raw = record[key];
  if (
    (typeof raw !== "number" && typeof raw !== "string") ||
    (typeof raw === "string" && !raw.trim())
  )
    return;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}
function structuredNutrition(
  product: Product,
): { nutrients: Record<string, number>; note: string } | undefined {
  const nutrition = product.nutrition;
  if (!nutrition) return;
  const sources = [...(nutrition.input_sets ?? [])]
    .filter((set) =>
      ["manufacturer", "packaging", "usda"].includes(set.source ?? ""),
    )
    .sort(
      (a, b) =>
        ["manufacturer", "packaging", "usda"].indexOf(a.source!) -
        ["manufacturer", "packaging", "usda"].indexOf(b.source!),
    );
  for (const set of [nutrition.aggregated_set, ...sources]) {
    if (
      !set ||
      (set.preparation && set.preparation !== "as_sold") ||
      set.per === "100ml"
    )
      continue;
    const quantity =
      set.per === "100g"
        ? 100
        : set.per === "serving" && set.per_unit === "g"
          ? set.per_quantity
          : undefined;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0) continue;
    const nutrients: Record<string, number> = {};
    for (const [name, fact] of Object.entries(set.nutrients ?? {})) {
      // Keep provider estimates or threshold-only values out of required logged nutrition.
      if (
        fact.source === "estimate" ||
        ["<", "<=", ">", ">="].includes(fact.modifier ?? "")
      )
        continue;
      const numeric = value({ raw: fact.value ?? "" }, "raw");
      if (numeric === undefined) continue;
      const unit =
        fact.unit?.toLowerCase() ??
        (name === "energy-kcal"
          ? "kcal"
          : name.startsWith("energy")
            ? "kj"
            : "g");
      const factor = name.startsWith("energy")
        ? unit === "kj" || unit === "kcal"
          ? 1
          : undefined
        : (
            {
              g: 1,
              mg: 0.001,
              kg: 1000,
              µg: 0.000001,
              mcg: 0.000001,
            } as Record<string, number>
          )[unit];
      if (factor === undefined) continue;
      const key = name.startsWith("energy")
        ? unit === "kcal"
          ? "energy-kcal"
          : "energy-kj"
        : name;
      nutrients[`${key}_100g`] = (numeric * factor * 100) / quantity;
    }
    const complete =
      (nutrients["energy-kcal_100g"] !== undefined ||
        nutrients["energy-kj_100g"] !== undefined) &&
      nutrients.proteins_100g !== undefined &&
      (nutrients["carbohydrates-total_100g"] !== undefined ||
        nutrients.carbohydrates_100g !== undefined) &&
      nutrients.fat_100g !== undefined;
    if (complete)
      return {
        nutrients,
        note: `${set.per === "serving" ? `Converted from a ${quantity} g serving. ` : ""}Open Food Facts as-sold nutrition${set.source ? ` · ${set.source}` : " · normalized source facts"}.`,
      };
  }
}
function servingGrams(product: Product): number | undefined {
  if (
    product.serving_quantity_unit?.toLowerCase() === "ml" ||
    /\bml\b/i.test(product.serving_size ?? "")
  )
    return;
  const quantity = Number(product.serving_quantity);
  if (Number.isFinite(quantity) && quantity > 0) return quantity;
  const grams = product.serving_size?.match(
    /(?:^|\s|\()(\d+(?:[.,]\d+)?)\s*(?:g|grams?)\b/i,
  );
  if (grams) return Number(grams[1].replace(",", "."));
  const ounces = product.serving_size?.match(
    /(?:^|\s|\()(\d+(?:[.,]\d+)?)\s*(?:oz|ounces?)\b/i,
  );
  return ounces
    ? Number(ounces[1].replace(",", ".")) * 28.349523125
    : undefined;
}
export function productToFood(product: Product): Food | null {
  const normalized = structuredNutrition(product);
  if (
    (product.nutrition?.aggregated_set ||
      product.nutrition?.input_sets?.length) &&
    !normalized
  )
    return null;
  // Explicit milliliter-only facts cannot be presented as grams without a density.
  if (
    !normalized &&
    (product.nutrition?.aggregated_set?.per === "100ml" ||
      product.serving_quantity_unit?.toLowerCase() === "ml" ||
      /\bml\b/i.test(product.serving_size ?? ""))
  )
    return null;
  const n = normalized?.nutrients ?? product.nutriments ?? {},
    grams = servingGrams(product);
  let converted = false;
  const per100 = (key: string) => {
    const direct = value(n, `${key}_100g`);
    if (direct !== undefined) return direct;
    const serving = value(n, `${key}_serving`);
    if (serving !== undefined && grams && grams > 0) {
      converted = true;
      return (serving * 100) / grams;
    }
  };
  const kj = per100("energy-kj") ?? per100("energy");
  const calories =
    per100("energy-kcal") ?? (kj === undefined ? undefined : kj / 4.184);
  const protein = per100("proteins"),
    carbs = per100("carbohydrates-total") ?? per100("carbohydrates"),
    fat = per100("fat");
  const name = [
    product.product_name,
    product.product_name_en,
    product.generic_name,
  ].find((name) => name?.trim());
  // Missing macros are not invented as zero. User can complete a manual entry instead.
  if (
    !name?.trim() ||
    !product.code ||
    calories === undefined ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  )
    return null;
  return {
    id: `off:${normalizeOffBarcode(product.code)}`,
    name: name.trim(),
    brand: product.brands ?? "",
    servingGrams: 100,
    calories,
    protein,
    carbs,
    fat,
    fiber: per100("fiber"),
    barcode: normalizeOffBarcode(product.code),
    source: "Open Food Facts · ODbL / DbCL",
    notes: [
      normalized?.note,
      converted
        ? `Nutrition converted from a ${grams} g package serving to 100 g.`
        : "",
      per100("carbohydrates-total") === undefined &&
      per100("carbohydrates") !== undefined
        ? "Available carbohydrate (excluding fiber), as reported by the source."
        : "",
      "Check the package label.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
/** OFF documents one canonical key for zero-padded UPC/EAN representations. */
function normalizeOffBarcode(code: string): string {
  const digits = code.replace(/^0+/, "") || "0";
  return digits.length <= 8
    ? digits.padStart(8, "0")
    : digits.length <= 13
      ? digits.padStart(13, "0")
      : digits;
}
export function validGtin(code: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const body = code.slice(0, -1);
  const sum = [...body]
    .reverse()
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (index % 2 ? 1 : 3),
      0,
    );
  return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}
export type BarcodeInputFormat = "auto" | "upc_e";
/** GS1 UPC-E zero suppression, with its full number-system and check digits. */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [system, a, b, c, d, e, selector, check] = code;
  const body =
    Number(selector) <= 2
      ? `${system}${a}${b}${selector}0000${c}${d}${e}`
      : selector === "3"
        ? `${system}${a}${b}${c}00000${d}${e}`
        : selector === "4"
          ? `${system}${a}${b}${c}${d}00000${e}`
          : `${system}${a}${b}${c}${d}${e}0000${selector}`;
  return validGtin(body + check) ? body + check : null;
}
export function extractBarcode(
  text: string,
  format: BarcodeInputFormat = "auto",
): string | null {
  let raw = text
    .trim()
    .replace(/[\s-]/g, "")
    .replaceAll(String.fromCharCode(29), "(");
  const gs1 = raw.match(/^(?:\]C1)?(?:\(01\)|01)(\d{14})(?:$|\()/);
  if (gs1) raw = gs1[1];
  if (/^\d{8,14}$/.test(raw)) {
    if (format === "upc_e") {
      const expanded = expandUpcE(raw);
      return expanded ? normalizeOffBarcode(expanded) : null;
    }
    const canonical = normalizeOffBarcode(raw);
    if (validGtin(canonical)) return canonical;
    const expanded = raw.length === 8 ? expandUpcE(raw) : null;
    return expanded ? normalizeOffBarcode(expanded) : null;
  }
  try {
    const url = new URL(text.trim());
    if (
      url.protocol === "https:" &&
      /(^|\.)openfoodfacts\.org$/.test(url.hostname)
    ) {
      const match = url.pathname.match(
        /\/(?:product|produit)\/(\d{8,14})(?:\/|$)/,
      );
      return match ? extractBarcode(match[1], format) : null;
    }
    // GS1 Digital Link permits brand-owned domains; never follow the supplied URL.
    if (url.protocol === "https:" && !url.username && !url.password) {
      const gtin = url.pathname.match(/\/01\/(\d{14})(?:\/|$)/)?.[1];
      return gtin && validGtin(gtin) ? normalizeOffBarcode(gtin) : null;
    }
  } catch {
    /* Not a supported QR identifier. */
  }
  return null;
}
export function savedBarcodeFood(
  foods: readonly Food[],
  text: string,
  format: BarcodeInputFormat = "auto",
): Food | undefined {
  const key = extractBarcode(text, format) ?? text.trim().replace(/\s+/g, "");
  if (!key) return;
  return foods.find(
    (food) =>
      food.barcode &&
      (extractBarcode(food.barcode) ??
        food.barcode.trim().replace(/\s+/g, "")) === key,
  );
}
export class FoodLookupError extends Error {
  constructor(
    message: string,
    public readonly barcode?: string,
    public readonly product?: Product,
  ) {
    super(message);
    this.name = "FoodLookupError";
  }
}
async function read(url: URL): Promise<unknown> {
  url.searchParams.set("app_name", "Setwise");
  url.searchParams.set("app_version", "1.4");
  // Browser User-Agent is controlled by the browser. Identification uses query parameters;
  // a deployer may route through a proxy that sets the required custom User-Agent.
  const response = await fetch(url, {
    headers: { "User-Agent": identifier },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 429 || response.status === 503)
    throw new Error(
      "Open Food Facts is rate limited. Use cached foods or try again later.",
    );
  if (response.status === 404) return { status: "failure" };
  if (!response.ok)
    throw new Error(
      "Food lookup unavailable. Add a custom food or use a cached entry.",
    );
  return response.json();
}
export async function lookupBarcode(
  text: string,
  format: BarcodeInputFormat = "auto",
): Promise<Food> {
  const barcode = extractBarcode(text, format);
  if (!barcode)
    throw new Error(
      "Check the printed barcode digits, including the check digit. Use UPC/EAN, UPC-E or a supported product URL; you can save an unknown code manually.",
    );
  if (lastProduct !== undefined && Date.now() - lastProduct < 4200)
    throw new Error("Please wait a few seconds before another barcode lookup.");
  lastProduct = Date.now();
  const url = new URL(
    `https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json`,
  );
  url.searchParams.set("fields", fields);
  const result = (await read(url)) as {
    product?: Product;
    status?: number | string;
  };
  const successful =
    result.status === undefined ||
    result.status === 1 ||
    ["success", "success_with_warnings"].includes(String(result.status));
  const food =
    successful && result.product ? productToFood(result.product) : null;
  if (!food)
    throw new FoodLookupError(
      "Product not found or nutrition is incomplete. Create a custom food from its package label.",
      barcode,
      result.product,
    );
  return food;
}
export interface FoodSearchPage {
  foods: Food[];
  page: number;
  hasMore: boolean;
  count: number;
  omitted: number;
}
export async function searchFoodPage(
  term: string,
  page = 1,
): Promise<FoodSearchPage> {
  if (term.trim().length < 2)
    throw new Error("Enter at least two characters to search.");
  if (!Number.isInteger(page) || page < 1 || page > 1000)
    throw new Error("Choose a valid search page.");
  if (lastSearch !== undefined && Date.now() - lastSearch < 6500)
    throw new Error(
      "Please wait a few seconds before searching again. Cached search works immediately.",
    );
  lastSearch = Date.now();
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.search = new URLSearchParams({
    search_terms: term.trim(),
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "50",
    page: String(page),
    fields,
  }).toString();
  const result = (await read(url)) as { products?: Product[]; count?: number };
  const products = Array.isArray(result.products) ? result.products : [];
  const foods = products
    .map(productToFood)
    .filter((food): food is Food => food !== null);
  const count = Number.isFinite(result.count)
    ? Number(result.count)
    : products.length;
  return {
    foods: [...new Map(foods.map((food) => [food.id, food])).values()],
    page,
    count,
    hasMore:
      result.count === undefined ? products.length === 50 : page * 50 < count,
    omitted: products.length - foods.length,
  };
}
export async function searchFoods(term: string): Promise<Food[]> {
  return (await searchFoodPage(term)).foods;
}
interface Detector {
  detect(
    source: HTMLVideoElement,
  ): Promise<{ rawValue: string; format?: string }[]>;
}
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};
function detectorConstructor(): DetectorConstructor | undefined {
  return (globalThis as unknown as { BarcodeDetector?: DetectorConstructor })
    .BarcodeDetector;
}
export function scannerSupported(): boolean {
  return Boolean(navigator.mediaDevices && globalThis.isSecureContext);
}
/** Camera frames stay in the browser. Always stop the returned cleanup when closing the scanner. */
export async function startBarcodeScanner(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  const Detector = detectorConstructor();
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.isSecureContext)
    throw new Error(
      "Camera scanning needs a supported browser and HTTPS. Enter the barcode manually.",
    );
  if (!Detector) {
    const { BrowserMultiFormatReader, BarcodeFormat } =
      await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      video,
      (result, _error, control) => {
        if (result) {
          const code = extractBarcode(
            result.getText(),
            result.getBarcodeFormat() === BarcodeFormat.UPC_E
              ? "upc_e"
              : "auto",
          );
          if (code) {
            control.stop();
            onCode(code);
          }
        }
      },
    );
    return () => controls.stop();
  }
  const formats = (await Detector.getSupportedFormats()).filter((f) =>
    [
      "ean_13",
      "ean_8",
      "upc_a",
      "upc_e",
      "qr_code",
      "code_128",
      "itf",
      "data_matrix",
    ].includes(f),
  );
  if (!formats.length)
    throw new Error(
      "No supported barcode format is available. Enter the barcode manually.",
    );
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  let stopped = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
  try {
    video.srcObject = stream;
    await video.play();
  } catch {
    stop();
    throw new Error("Camera could not start. Enter the barcode manually.");
  }
  const detector = new Detector({ formats });
  const detect = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (stopped) return;
      const code = codes
        .map((c) =>
          extractBarcode(c.rawValue, c.format === "upc_e" ? "upc_e" : "auto"),
        )
        .find(Boolean);
      if (code) {
        stop();
        onCode(code);
        return;
      }
    } catch {
      stop();
      onError("Barcode recognition failed. Enter the barcode manually.");
      return;
    }
    if (!stopped)
      timer = setTimeout(() => {
        void detect();
      }, 350);
  };
  void detect();
  return stop;
}
