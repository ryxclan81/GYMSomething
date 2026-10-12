import type { Food } from "../domain/types";
interface Product {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, number | string>;
}
const fields = "code,product_name,product_name_en,brands,nutriments";
let lastSearch = 0,
  lastProduct = 0;
const identifier = "Setwise/1.3 (local-first personal fitness app)";
function value(
  record: Record<string, number | string>,
  key: string,
): number | undefined {
  const raw = record[key];
  if (raw === undefined || raw === "") return;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}
export function productToFood(product: Product): Food | null {
  const n = product.nutriments ?? {},
    calories =
      value(n, "energy-kcal_100g") ??
      (value(n, "energy-kj_100g") === undefined
        ? undefined
        : value(n, "energy-kj_100g")! / 4.184);
  const protein = value(n, "proteins_100g"),
    carbs = value(n, "carbohydrates_100g"),
    fat = value(n, "fat_100g"),
    name = product.product_name ?? product.product_name_en;
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
    id: `off:${product.code}`,
    name,
    brand: product.brands ?? "",
    servingGrams: 100,
    calories,
    protein,
    carbs,
    fat,
    fiber: value(n, "fiber_100g"),
    barcode: product.code,
    source: "Open Food Facts · ODbL / DbCL",
  };
}
export function extractBarcode(text: string): string | null {
  const raw = text.trim();
  if (/^\d{8,14}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (
      url.protocol === "https:" &&
      /(^|\.)openfoodfacts\.org$/.test(url.hostname)
    ) {
      const match = url.pathname.match(
        /\/(?:product|produit)\/(\d{8,14})(?:\/|$)/,
      );
      return match?.[1] ?? null;
    }
  } catch {
    /* Not a supported QR identifier. */
  }
  return null;
}
async function read(url: URL): Promise<unknown> {
  url.searchParams.set("app_name", "Setwise");
  url.searchParams.set("app_version", "1.0");
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
  if (!response.ok)
    throw new Error(
      "Food lookup unavailable. Add a custom food or use a cached entry.",
    );
  return response.json();
}
export async function lookupBarcode(text: string): Promise<Food> {
  const barcode = extractBarcode(text);
  if (!barcode)
    throw new Error(
      "Enter an 8–14 digit barcode or an Open Food Facts product URL. Other QR codes are unsupported.",
    );
  if (Date.now() - lastProduct < 4200)
    throw new Error("Please wait a few seconds before another barcode lookup.");
  lastProduct = Date.now();
  const url = new URL(
    `https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json`,
  );
  url.searchParams.set("fields", fields);
  const result = (await read(url)) as { product?: Product; status?: number };
  const food = result.product ? productToFood(result.product) : null;
  if (!food)
    throw new Error(
      "Product not found or nutrition is incomplete. Create a custom food from its package label.",
    );
  return food;
}
export async function searchFoods(term: string): Promise<Food[]> {
  if (term.trim().length < 2)
    throw new Error("Enter at least two characters to search.");
  if (Date.now() - lastSearch < 6500)
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
    page_size: "20",
    fields,
  }).toString();
  const result = (await read(url)) as { products?: Product[] };
  return (result.products ?? [])
    .map(productToFood)
    .filter((food): food is Food => food !== null);
}
interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
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
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      video,
      (result, _error, control) => {
        if (result) {
          const code = extractBarcode(result.getText());
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
    ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128"].includes(f),
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
      const code = codes.map((c) => extractBarcode(c.rawValue)).find(Boolean);
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
