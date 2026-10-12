import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractBarcode,
  expandUpcE,
  validGtin,
  productToFood,
  savedBarcodeFood,
  type Product,
} from "./food";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("food product normalization", () => {
  it("requires complete macros rather than fabricating zero", () => {
    expect(
      productToFood({
        code: "1234567890123",
        product_name: "Product",
        nutriments: { "energy-kcal_100g": 150 },
      }),
    ).toBeNull();
  });
  it("keeps 100 gram values with explicit source attribution", () => {
    expect(
      productToFood({
        code: "1234567890123",
        product_name: "Product",
        brands: "Brand",
        nutriments: {
          "energy-kcal_100g": 150,
          proteins_100g: 4,
          carbohydrates_100g: 20,
          fat_100g: 3,
        },
      }),
    ).toMatchObject({
      servingGrams: 100,
      calories: 150,
      protein: 4,
      carbs: 20,
      fat: 3,
      source: "Open Food Facts · ODbL / DbCL",
    });
  });
  it("converts kilojoules when energy in kcal is missing", () => {
    expect(
      productToFood({
        code: "1234567890123",
        product_name: "Product",
        nutriments: {
          "energy-kj_100g": 418.4,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      })?.calories,
    ).toBeCloseTo(100);
  });
});
describe("barcode and QR identifiers", () => {
  it.each(["96385074", "0012345000058", "3017620422003"])(
    "supports numeric identifier %s",
    (code) => expect(extractBarcode(code)).toBe(code),
  );
  it("supports known OFF product QR links", () =>
    expect(
      extractBarcode(
        "https://world.openfoodfacts.org/product/3017620422003/foo",
      ),
    ).toBe("3017620422003"));
  it.each([
    "https://malicious.example/1234567890123",
    "https://openfoodfacts.org.attacker.com/product/1234567890123",
    "javascript:alert(1)",
    "123",
    "hello",
  ])("rejects unsupported QR %s", (code) =>
    expect(extractBarcode(code)).toBeNull(),
  );
});
it("handles missing product responses gracefully and respects client throttle", async () => {
  vi.resetModules();
  const { lookupBarcode } = await import("./food");
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(lookupBarcode("3017620422003")).rejects.toThrow(/not found/);
  await expect(lookupBarcode("3017620422003")).rejects.toThrow(/wait/);
  expect(fetch).toHaveBeenCalledTimes(1);
});

const actualCode = "3017620422003";
const completeProduct = (): Product => ({
  code: actualCode,
  product_name: "Package food",
  brands: "Test brand",
  nutriments: {
    "energy-kcal_100g": 150,
    proteins_100g: 4,
    carbohydrates_100g: 20,
    fat_100g: 3,
  },
});
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("expanded food normalization", () => {
  it("retains complete legacy facts when the optional new nutrition object is empty", () => {
    const p = completeProduct();
    p.nutrition = {};
    expect(productToFood(p)).toMatchObject({
      calories: 150,
      protein: 4,
      carbs: 20,
      fat: 3,
    });
    p.nutrition = { input_sets: [] };
    expect(productToFood(p)?.calories).toBe(150);
  });
  it("treats blank and null fields as missing, not zero", () => {
    const p = completeProduct();
    p.nutriments!.proteins_100g = " ";
    expect(productToFood(p)).toBeNull();
    p.nutriments!.proteins_100g = null as unknown as number;
    expect(productToFood(p)).toBeNull();
  });
  it("accepts missing optional fiber, numeric strings and legitimate zero macros", () => {
    const p = completeProduct();
    p.product_name = "";
    p.product_name_en = "English name";
    p.nutriments!.fat_100g = "0";
    expect(productToFood(p)).toMatchObject({
      servingGrams: 100,
      calories: 150,
      fat: 0,
      name: "English name",
    });
    expect(productToFood(p)?.fiber).toBeUndefined();
  });
  it("converts normalized legacy kilojoules and gram-based serving nutrients", () => {
    expect(
      productToFood({
        code: actualCode,
        product_name: "Food",
        serving_size: "1 bar (40 g)",
        nutriments: {
          "energy-kj_serving": 418.4,
          proteins_serving: 2,
          carbohydrates_serving: 10,
          fat_serving: 3,
        },
      }),
    ).toMatchObject({
      servingGrams: 100,
      calories: 250,
      protein: 5,
      carbs: 25,
      fat: 7.5,
    });
  });
  it("reads actual v3 normalized facts and explicit total carbohydrates", () => {
    const p: Product = {
      code: actualCode,
      product_name: "Food",
      nutrition: {
        aggregated_set: {
          per: "100g",
          preparation: "as_sold",
          nutrients: {
            "energy-kcal": { value: 150, unit: "kcal", source: "manufacturer" },
            proteins: { value: 4, unit: "g" },
            "carbohydrates-total": { value: 23, unit: "g" },
            carbohydrates: { value: 20, unit: "g" },
            fat: { value: 3, unit: "g" },
          },
        },
      },
    };
    expect(productToFood(p)).toMatchObject({
      calories: 150,
      protein: 4,
      carbs: 23,
      fat: 3,
    });
    expect(productToFood(p)?.fiber).toBeUndefined();
    p.nutriments = completeProduct().nutriments;
    expect(productToFood(p)?.carbs).toBe(23);
  });
  it("uses complete as-sold manufacturer/package serving facts with documented units", () => {
    const p: Product = {
      code: actualCode,
      product_name: "Food",
      nutrition: {
        input_sets: [
          {
            source: "manufacturer",
            preparation: "as_sold",
            per: "serving",
            per_quantity: 50,
            per_unit: "g",
            nutrients: {
              "energy-kj": { value: 418.4, unit: "kJ" },
              proteins: { value: 2000, unit: "mg" },
              carbohydrates: { value: 10, unit: "g" },
              fat: { value: 3, unit: "g" },
            },
          },
        ],
      },
    };
    expect(productToFood(p)).toMatchObject({ protein: 4, carbs: 20, fat: 6 });
    expect(productToFood(p)?.calories).toBeCloseTo(200);
  });
  it("does not invent density, preparation values or required macro estimates", () => {
    const p: Product = {
      code: actualCode,
      product_name: "Food",
      nutrition: {
        aggregated_set: {
          per: "100ml",
          preparation: "as_sold",
          nutrients: {
            "energy-kcal": { value: 50 },
            proteins: { value: 1 },
            carbohydrates: { value: 10 },
            fat: { value: 0 },
          },
        },
      },
      nutriments: completeProduct().nutriments,
    };
    expect(productToFood(p)).toBeNull();
    p.nutrition!.aggregated_set!.per = "100g";
    p.nutrition!.aggregated_set!.preparation = "prepared";
    expect(productToFood(p)).toBeNull();
    p.nutrition!.aggregated_set!.preparation = "as_sold";
    p.nutrition!.aggregated_set!.nutrients!.proteins.source = "estimate";
    expect(productToFood(p)).toBeNull();
  });
});

describe("barcode variants", () => {
  it("validates check digits and matches equivalent UPC/EAN/GTIN padding", () => {
    expect(validGtin("012345000058")).toBe(true);
    expect(validGtin("012345000059")).toBe(false);
    expect(extractBarcode("012345000058")).toBe("0012345000058");
    expect(extractBarcode("00 12345 000058")).toBe("0012345000058");
    expect(extractBarcode("00012345000058")).toBe("0012345000058");
  });
  it("expands a known UPC-E without guessing an ambiguous EAN-8", () => {
    expect(expandUpcE("01234558")).toBe("012345000058");
    expect(extractBarcode("01234558", "upc_e")).toBe("0012345000058");
    expect(expandUpcE("01234559")).toBeNull();
    expect(expandUpcE("21234558")).toBeNull();
  });
  it("extracts GS1 Digital Link and AI01 GS1-128 identifiers without following URLs", () => {
    expect(
      extractBarcode("https://brand.example/01/03017620422003/10/LOT"),
    ).toBe(actualCode);
    expect(extractBarcode("(01)03017620422003(10)LOT")).toBe(actualCode);
    expect(extractBarcode("]C10103017620422003")).toBe(actualCode);
  });
  it("finds manual foods offline through canonical variants or exact private codes", () => {
    const food = {
      ...productToFood(completeProduct())!,
      barcode: "012345000058",
    };
    expect(savedBarcodeFood([food], "0012345000058")).toBe(food);
    expect(savedBarcodeFood([food], "01234558", "upc_e")).toBe(food);
    const privateCode = { ...food, barcode: "LOCAL-SNACK-A" };
    expect(savedBarcodeFood([privateCode], "LOCAL-SNACK-A")).toBe(privateCode);
  });
});

describe("current provider responses and search pagination", () => {
  it("accepts string success status and requests current nutrition fields", async () => {
    vi.resetModules();
    const { lookupBarcode } = await import("./food");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        response({ status: "success", product: completeProduct() }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(lookupBarcode(actualCode)).resolves.toMatchObject({
      barcode: actualCode,
    });
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("fields")).toContain("nutrition");
  });
  it("rejects failure even if a product body exists", async () => {
    vi.resetModules();
    const { lookupBarcode } = await import("./food");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ status: "failure", product: completeProduct() }),
        ),
    );
    await expect(lookupBarcode(actualCode)).rejects.toThrow(/not found/);
  });
  it("advances search pages, exposes raw incomplete records and honors throttle", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const { searchFoodPage } = await import("./food");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          count: 120,
          products: [
            completeProduct(),
            { code: "96385074", product_name: "Incomplete" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({ count: 120, products: [completeProduct()] }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(searchFoodPage("snacks")).resolves.toMatchObject({
      page: 1,
      hasMore: true,
      count: 120,
      omitted: 1,
    });
    await expect(searchFoodPage("snacks", 2)).rejects.toThrow(/wait/);
    vi.advanceTimersByTime(6501);
    await expect(searchFoodPage("snacks", 2)).resolves.toMatchObject({
      page: 2,
      hasMore: true,
    });
    const url = new URL(String(fetch.mock.calls[1][0]));
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("50");
  });
  it("reports rate limits instead of silently substituting a generic product", async () => {
    vi.resetModules();
    const { lookupBarcode } = await import("./food");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 429)));
    await expect(lookupBarcode(actualCode)).rejects.toThrow(/rate limited/);
  });
});
