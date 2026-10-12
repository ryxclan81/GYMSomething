import { describe, it, expect, vi, afterEach } from "vitest";
import { extractBarcode, productToFood } from "./food";
afterEach(() => vi.unstubAllGlobals());
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
  it.each(["12345678", "123456789012", "1234567890123"])(
    "supports numeric identifier %s",
    (code) => expect(extractBarcode(code)).toBe(code),
  );
  it("supports known OFF product QR links", () =>
    expect(
      extractBarcode(
        "https://world.openfoodfacts.org/product/1234567890123/foo",
      ),
    ).toBe("1234567890123"));
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
  await expect(lookupBarcode("1234567890123")).rejects.toThrow(/not found/);
  await expect(lookupBarcode("1234567890123")).rejects.toThrow(/wait/);
  expect(fetch).toHaveBeenCalledTimes(1);
});
