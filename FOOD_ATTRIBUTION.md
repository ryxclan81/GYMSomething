# Offline food reference data

Setwise includes **905 USDA reference foods across 21 categories**, generated from the official **FoodData Central SR Legacy, April 2018** JSON download. It is a curated offline snapshot for generic food logging, not a live branded-product catalog. SR Legacy is a final historical release; its records are not updated. See the [USDA download page](https://fdc.nal.usda.gov/download-datasets/) and [data type documentation](https://fdc.nal.usda.gov/data-documentation/).

Source attribution: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, SR Legacy (April 2018), accessed 12 October 2026. USDA states that FoodData Central data are public domain and published under **CC0 1.0**. No reuse permission is required; USDA requests source attribution. Setwise is not endorsed by USDA. [USDA API guide and licensing](https://fdc.nal.usda.gov/api-guide/#bkmk-9).

## Verified source and reproducible generation

- Official archive: [FoodData_Central_sr_legacy_food_json_2018-04.zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip).
- ZIP size: **13,456,312 bytes**.
- SHA-256: `0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef`.
- JSON member: `FoodData_Central_sr_legacy_food_json_2018-04.json`, collection `SRLegacyFoods`.
- Source records: **7,793**; all had valid required macro entries for this import.
- Generated module: `src/data/foods.ts`, **375,006 bytes**, with `starterFoods`, `foodCatalogSource` and `foodSourceUrl` exports.

The raw archive is a development artifact in `artifacts/food-catalog/`, excluded from delivery. Only the compact generated food module is bundled with Nutrition. The generator requires Python 3.10 or later and uses the standard library:

```sh
python scripts/build-food-catalog.py --download
python scripts/test_build_food_catalog.py
```

Or download the official ZIP yourself and pass it explicitly:

```sh
python scripts/build-food-catalog.py --input path/to/official-sr-legacy.zip
```

The script validates the archive hash before reading it and never extracts arbitrary archive paths. Re-running it against the verified snapshot produces the same module. No API key is needed for this bulk import. A live FoodData Central API integration would require a key and is not part of the offline library.

## Nutrient mapping

Values represent **100 g of edible portion**, not one package, cup, fruit or typical serving. Selecting another gram amount scales the reference. Names retain USDA's preparation qualifiers, including raw, dry, cooked, drained, salted and unsalted. Those qualifiers matter: dry oats and cooked oats are different records. See the [SR Legacy documentation](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR-Legacy/SR-Legacy_Doc.pdf).

| App field | FoodData Central nutrient ID | Required source unit |
| --- | --- | --- |
| Calories | 1008, Energy | kcal |
| Protein | 1003, Protein | g |
| Carbohydrate | 1005, Carbohydrate, by difference | g |
| Fat | 1004, Total lipid (fat) | g |
| Fiber, when present | 1079, Fiber, total dietary | g |

The importer checks IDs and units; it does not infer calories from macros or substitute kilojoules, old nutrient-number strings or similarly named fields. Missing, non-finite, negative or contradictory required values exclude a record. Missing or invalid fiber is omitted; recorded zeros stay zero. No nutrient values are fabricated. USDA's reference values themselves can come from analysis, calculations or literature; they are food-composition estimates, not measurements of the user's portion.

## Selection rules and limits

This is a transparent subset, not all 7,793 foods. The script retains at most **45 records per category** and **4 per broad family**, where a family uses the first two comma-separated parts of the USDA description. It favors shorter, less specialized descriptions and common ingredient keywords, including their plural forms. **Forty explicitly listed FDC records** guarantee useful common references: plain milk and Greek yogurt, raw/cooked eggs, dry/cooked oats and rice, roasted chicken breast, whole-wheat bread, peanut butter, raw banana/apple/berries/orange/avocado, familiar raw vegetables, cooked salmon and canned tuna, cooked beans/lentils, almonds, olive oil, cooked quinoa, drinking water and brewed coffee. The generator fails if any priority reference is omitted. These are selection preferences only; their nutrient values are copied unchanged.

The importer excludes Baby Foods, Fast Foods, Restaurant Foods and American Indian/Alaska Native Foods from this initial general-purpose selection (**931 records**). Identified named products and uppercase product-label patterns are excluded (**621 records**), with USDA, NFS and BBQ accepted as descriptor abbreviations. Brand filtering is conservative and not a guarantee that every retained description is entirely brand-neutral. No generic food is assigned a barcode or represented as a match for a scanned packaged product.

The result covers baked foods, meats, beverages, breakfast cereals, grains and pasta, dairy and eggs, fats and oils, fish, fruits, legumes, mixed meals, nuts and seeds, snacks, sauces, herbs, sweets and vegetables. Exact per-category counts are included in `foodCatalogSource`. Many specialized varieties and branded snacks remain absent. Online packaged-product lookup and manual entry remain separate options.

The library is frozen and read-only. It is not inserted wholesale into device records. Choosing a food stores that food and the diary snapshot; editing or favoriting it can create a saved override. This keeps the reference library separate from personal data and avoids enlarging every local backup with unused foods. The app's existing local-storage and full-backup formats remain unchanged.

## Validation

The importer tests required nutrient presence, units and IDs; missing versus real zero fiber; non-finite/negative values; conflicting duplicate nutrients; duplicate FDC IDs; deterministic selection; and named-product filtering. TypeScript tests cover catalog count, provenance, unique IDs, immutable seed behavior, absence of barcodes and several preparation-specific nutrient references. Current run results are reported in `TEST_REPORT.md` by the release workflow rather than assumed here.
