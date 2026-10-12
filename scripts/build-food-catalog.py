"""Build Setwise's offline foods from the official USDA SR Legacy JSON archive.

Standard library only. No API key. No nutrient inference or barcode assignments.
Run: python scripts/build-food-catalog.py [--input official-sr-legacy.zip]
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
from urllib.request import Request, urlopen
from zipfile import ZipFile

PROJECT = Path(__file__).resolve().parents[1]
DATASET_URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip"
ARCHIVE_SHA256 = "0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef"
ARCHIVE_MEMBER = "FoodData_Central_sr_legacy_food_json_2018-04.json"
EXCLUDED_CATEGORIES = {
    "Baby Foods", "Fast Foods", "Restaurant Foods",
    "American Indian/Alaska Native Foods",
}
PER_CATEGORY = 45
PER_FAMILY = 4
COMMON_REFERENCE_IDS = {
    171265, 171267, 170872, 171269,  # Whole/2%/1%/skim milk.
    170894, 170903, 171304,  # Plain Greek yogurt: nonfat/lowfat/whole.
    173424, 173423,  # Cooked whole egg: hard-boiled/fried.
    173904, 173905,  # Plain oats: dry/cooked.
    169756, 169757,  # Long-grain white rice: raw/cooked without salt.
    171477, 172688,  # Roasted chicken breast and whole-wheat bread.
    172470,  # Smooth peanut butter without salt.
    173944, 171688, 167762, 171711, 169097, 171705,  # Raw banana/apple/berries/orange/avocado.
    168462, 170393, 170026, 170379, 170457, 169247, 168409, 170000,  # Familiar raw vegetables.
    171998, 171986, 173735, 172421,  # Cooked salmon, canned tuna, cooked beans/lentils.
    170567, 171413,  # Almonds and olive oil.
    171287, 168917,  # Raw whole egg and cooked quinoa.
    173647, 171890,  # Tap drinking water and plain brewed coffee.
}
# Explicitly named legacy products are omitted where identified. Names remain
# exactly as USDA describes them; no product is mapped to a generic barcode.
BRAND_PATTERN = re.compile(
    r"\b(?:PILLSBURY|KELLOGG|CAMPBELL|MCDONALD|BURGER KING|WENDY|TACO BELL|"
    r"SUBWAY|PIZZA HUT|DOMINO|LITTLE CAESAR|KFC|POPEYE|SCHOOL LUNCH|"
    r"QUAKER|GENERAL MILLS|NABISCO|KEEBLER|POST|MALT-O-MEAL|MALT O MEAL|"
    r"NESTLE|NESQUIK|HERSHEY|MARS|SNICKERS|KIT KAT|REESE|M\s*&\s*M|"
    r"SNACKWELL|SUNSHINE|PEPPERIDGE|ENTENMANN|KASHI|GATORADE|POWERADE|"
    r"COCA.COL[A]?|PEPSI|SPRITE|DR PEPPER|REDBULL|RED BULL|MONSTER|"
    r"SLIM.FAST|ENSURE|BOOST|OVALTINE|CARNATION|OCEAN SPRAY|V8|"
    r"SWANSON|PROGRESSO|HEALTHY CHOICE|LEAN CUISINE|STOUFFER|"
    r"OSCAR MAYER|TYSON|PERDUE|HORMEL|KRAFT|VELVEETA|CHEEZ|CHEETOS|"
    r"FRITOS|DORITOS|RUFFLES|PRINGLES|TOSTITOS|SUN CHIPS|LAYS|LAY'S|"
    r"OREO|TRISCUIT|WHEAT THINS|RITZ|POP.TARTS|MOTHER'S|MARIE CALLENDER|"
    r"SMART ONES|JIMMY DEAN|BOB EVANS|DENNY|APPLEBEE|OLIVE GARDEN|"
    r"BOSTON MARKET|CRACKER BARREL|CHICK.FIL.A|WHITE CASTLE|JACK IN THE BOX|"
    r"SILK|MORNINGSTAR|BOCA|YOPLAIT|DANNON|ACTIVIA|DANIMALS|"
    r"SMUCKER|JIF|SKIPPY|PETER PAN|WELCH|DELMONTE|DEL MONTE)\b",
    re.IGNORECASE,
)
COMMON_PATTERN = re.compile(
    r"\b(?:rice|oats|oatmeal|bread|pasta|bananas?|apples?|oranges?|berries|"
    r"(?:blue|straw|rasp|black)berr(?:y|ies)|"
    r"egg|milk|yogurt|cheese|chicken|beef|pork|turkey|salmon|tuna|"
    r"potato(?:es)?|broccoli|carrots?|tomato(?:es)?|spinach|bean|beans|lentil|lentils|"
    r"peanut|peanuts|almond|almonds|popcorn|chips|chocolate|coffee|tea|water)\b",
    re.IGNORECASE,
)

# FDC nutrient IDs, not the old nutrient-number strings or display-name guesses.
REQUIRED = {
    "calories": (1008, "KCAL"),
    "protein": (1003, "G"),
    "carbs": (1005, "G"),
    "fat": (1004, "G"),
}


def nutrient_amount(record: dict, nutrient_id: int, unit: str) -> float | int | None:
    values = []
    for entry in record.get("foodNutrients", []):
        nutrient = entry.get("nutrient", {})
        if nutrient.get("id") != nutrient_id:
            continue
        if str(nutrient.get("unitName", "")).strip().upper() != unit:
            return None
        amount = entry.get("amount")
        if isinstance(amount, bool) or not isinstance(amount, (int, float)):
            return None
        if not math.isfinite(amount) or amount < 0:
            return None
        values.append(amount)
    # Conflicting duplicate measurements must not be picked arbitrarily.
    if not values or any(value != values[0] for value in values[1:]):
        return None
    return values[0]


def convert_record(record: dict) -> dict | None:
    if record.get("dataType") != "SR Legacy":
        return None
    identifier = record.get("fdcId")
    description = record.get("description")
    if isinstance(identifier, bool) or not isinstance(identifier, int) or identifier <= 0:
        return None
    if not isinstance(description, str) or not description.strip():
        return None
    amounts = {key: nutrient_amount(record, *definition) for key, definition in REQUIRED.items()}
    if any(amount is None for amount in amounts.values()):
        return None
    food = {
        "id": f"usda-sr-{identifier}", "name": description.strip(),
        "brand": "Generic USDA reference", "servingGrams": 100,
        **amounts,
        "source": f"USDA FoodData Central · SR Legacy (2018) · FDC {identifier}",
        "notes": "Generic reference per 100 g edible portion. Match the raw/cooked preparation. "
                 f"https://fdc.nal.usda.gov/food-details/{identifier}/nutrients",
    }
    fiber = nutrient_amount(record, 1079, "G")
    if fiber is not None:
        food["fiber"] = fiber
    return food


def selection_key(record: dict) -> tuple:
    name = record["description"].strip()
    detailed = len(re.findall(r"retail|separable|USDA choice|USDA select|trimmed|grade", name, re.I))
    score = (1000 if record["fdcId"] in COMMON_REFERENCE_IDS else 0) + (40 if COMMON_PATTERN.search(name) else 0) - len(name) / 8 - detailed * 8
    return (-score, name.casefold(), record["fdcId"])


def select_foods(records: list[dict]) -> tuple[list[dict], dict]:
    groups: dict[str, list[tuple[dict, dict]]] = defaultdict(list)
    stats = Counter()
    ids = set()
    for record in records:
        stats["inputRecords"] += 1
        food = convert_record(record)
        if food is None:
            stats["invalidOrIncompleteRecords"] += 1
            continue
        stats["macroCompleteRecords"] += 1
        if food["id"] in ids:
            raise ValueError(f"Duplicate FDC identifier: {food['id']}")
        ids.add(food["id"])
        category = record.get("foodCategory", {}).get("description", "")
        if not category or category in EXCLUDED_CATEGORIES:
            stats["excludedCategoryRecords"] += 1
            continue
        uppercase_product = any(word not in {"USDA", "NFS", "BBQ"}
                                for word in re.findall(r"\b[A-Z]{3,}\b", food["name"]))
        if BRAND_PATTERN.search(food["name"]) or uppercase_product:
            stats["namedProductRecords"] += 1
            continue
        groups[category].append((record, food))
    selected, category_counts = [], {}
    for category in sorted(groups):
        family_counts = Counter()
        count = 0
        for record, food in sorted(groups[category], key=lambda pair: selection_key(pair[0])):
            # First two comma-separated descriptor parts identify a broad family.
            family = ",".join(part.strip().casefold() for part in food["name"].split(",")[:2])
            if family_counts[family] >= PER_FAMILY:
                continue
            selected.append(food)
            family_counts[family] += 1
            count += 1
            if count >= PER_CATEGORY:
                break
        category_counts[category] = count
    selected.sort(key=lambda food: (food["name"].casefold(), food["id"]))
    return selected, {**dict(stats), "selectedRecords": len(selected), "categoryCounts": category_counts}


def read_archive(path: Path) -> list[dict]:
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != ARCHIVE_SHA256:
        raise ValueError(f"Archive hash differs from the verified USDA snapshot: {actual}")
    with ZipFile(path) as archive:
        info = archive.getinfo(ARCHIVE_MEMBER)
        if info.file_size > 300_000_000:
            raise ValueError("Archive JSON exceeds the supported size")
        data = json.loads(archive.read(info).decode("utf-8-sig"))
    records = data.get("SRLegacyFoods")
    if not isinstance(records, list):
        raise ValueError("Expected official SRLegacyFoods JSON collection")
    return records


def build(path: Path, output: Path) -> dict:
    foods, stats = select_foods(read_archive(path))
    selected_ids = {int(food["id"].removeprefix("usda-sr-")) for food in foods}
    if missing := COMMON_REFERENCE_IDS - selected_ids:
        raise ValueError(f"Common reference foods were omitted by selection: {sorted(missing)}")
    metadata = {
        "name": "USDA FoodData Central",
        "dataset": "SR Legacy", "release": "April 2018",
        "downloadUrl": DATASET_URL,
        "documentationUrl": "https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR-Legacy/SR-Legacy_Doc.pdf",
        "license": "Public domain / CC0 1.0",
        "archiveSha256": ARCHIVE_SHA256, "referenceGrams": 100,
        "selection": {"perCategory": PER_CATEGORY, "perFamily": PER_FAMILY,
                      "priorityFdcIds": sorted(COMMON_REFERENCE_IDS),
                      "uppercaseExceptions": ["USDA", "NFS", "BBQ"],
                      "excludedCategories": sorted(EXCLUDED_CATEGORIES)},
        **stats,
    }
    lines = [
        'import type { Food } from "../domain/types";', "",
        "// Generated from verified USDA public-domain data. See FOOD_ATTRIBUTION.md.",
        "// Regenerate with python scripts/build-food-catalog.py; do not hand-edit nutrients.",
        f"export const foodCatalogSource = {json.dumps(metadata, ensure_ascii=False, indent=2)} as const;",
        "", "export const starterFoods: readonly Food[] = Object.freeze([",
    ]
    lines.extend(f"  Object.freeze({json.dumps(food, ensure_ascii=False, separators=(',', ':'))})," for food in foods)
    lines.extend([
        "]);", "",
        "export function foodSourceUrl(food: Food): string | undefined {",
        "  const match = /^usda-sr-(\\d+)$/.exec(food.id);",
        "  return match ? `https://fdc.nal.usda.gov/food-details/${match[1]}/nutrients` : undefined;",
        "}", "",
    ])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=PROJECT / "artifacts/food-catalog/usda-sr-legacy-2018.zip")
    parser.add_argument("--output", type=Path, default=PROJECT / "src/data/foods.ts")
    parser.add_argument("--download", action="store_true", help="Download the official pinned archive if needed")
    args = parser.parse_args()
    if not args.input.exists():
        if not args.download:
            parser.error("Archive missing. Use --download, or supply the official ZIP with --input.")
        args.input.parent.mkdir(parents=True, exist_ok=True)
        request = Request(DATASET_URL, headers={"User-Agent": "Setwise-food-catalog/1.0"})
        with urlopen(request, timeout=120) as response:
            args.input.write_bytes(response.read())
    metadata = build(args.input, args.output)
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"Output: {args.output} ({args.output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
