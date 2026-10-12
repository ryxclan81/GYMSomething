"""Meaningful import validation tests, using small synthetic nutrient records."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("food_catalog", Path(__file__).with_name("build-food-catalog.py"))
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


def record():
    return {
        "fdcId": 123, "description": "Example food, raw", "dataType": "SR Legacy",
        "foodCategory": {"description": "Vegetables and Vegetable Products"},
        "foodNutrients": [
            {"nutrient": {"id": 1008, "unitName": "kcal"}, "amount": 42},
            {"nutrient": {"id": 1003, "unitName": "g"}, "amount": 1.2},
            {"nutrient": {"id": 1005, "unitName": "g"}, "amount": 8.4},
            {"nutrient": {"id": 1004, "unitName": "g"}, "amount": 0.3},
        ],
    }


class FoodCatalogTests(unittest.TestCase):
    def test_records_actual_values_per_100g_and_preserves_description(self):
        data = record()
        original = copy.deepcopy(data)
        food = catalog.convert_record(data)
        self.assertEqual(food["calories"], 42)
        self.assertEqual(food["protein"], 1.2)
        self.assertEqual(food["carbs"], 8.4)
        self.assertEqual(food["fat"], 0.3)
        self.assertEqual(food["servingGrams"], 100)
        self.assertEqual(food["name"], data["description"])
        self.assertIn("/123/nutrients", food["notes"])
        self.assertNotIn("barcode", food)
        self.assertEqual(data, original)

    def test_missing_required_macro_excludes_record(self):
        for index in range(4):
            with self.subTest(index=index):
                data = record()
                data["foodNutrients"].pop(index)
                self.assertIsNone(catalog.convert_record(data))

    def test_wrong_energy_and_macro_units_are_not_treated_as_kcal_or_grams(self):
        for index, unit in [(0, "kJ"), (1, "mg"), (2, "mg"), (3, "mg")]:
            with self.subTest(index=index):
                data = record()
                data["foodNutrients"][index]["nutrient"]["unitName"] = unit
                self.assertIsNone(catalog.convert_record(data))

    def test_old_nutrient_numbers_and_display_names_do_not_replace_actual_ids(self):
        data = record()
        data["foodNutrients"][0]["nutrient"] = {"id": 208, "name": "Energy", "unitName": "kcal"}
        self.assertIsNone(catalog.convert_record(data))

    def test_missing_fiber_stays_missing_and_recorded_zero_stays_zero(self):
        data = record()
        self.assertNotIn("fiber", catalog.convert_record(data))
        data["foodNutrients"].append({"nutrient": {"id": 1079, "unitName": "g"}, "amount": 0})
        self.assertEqual(catalog.convert_record(data)["fiber"], 0)
        data["foodNutrients"][-1]["nutrient"]["unitName"] = "mg"
        self.assertNotIn("fiber", catalog.convert_record(data))

    def test_actual_zero_macros_are_kept_without_filling_missing_values(self):
        data = record()
        for nutrient in data["foodNutrients"]:
            nutrient["amount"] = 0
        self.assertEqual(catalog.convert_record(data)["calories"], 0)
        self.assertEqual(catalog.convert_record(data)["protein"], 0)

    def test_invalid_numeric_values_are_rejected(self):
        for amount in [-1, float("nan"), float("inf"), None, "0", True]:
            with self.subTest(amount=amount):
                data = record()
                data["foodNutrients"][0]["amount"] = amount
                self.assertIsNone(catalog.convert_record(data))

    def test_conflicting_duplicate_nutrients_are_not_chosen_arbitrarily(self):
        data = record()
        duplicate = copy.deepcopy(data["foodNutrients"][0])
        duplicate["amount"] = 99
        data["foodNutrients"].append(duplicate)
        self.assertIsNone(catalog.convert_record(data))

    def test_other_data_types_are_not_interpreted_as_sr_legacy(self):
        data = record()
        data["dataType"] = "Branded"
        self.assertIsNone(catalog.convert_record(data))

    def test_selection_is_deterministic_and_category_limits_are_explicit(self):
        records = [{**record(), "fdcId": index + 1, "description": f"Vegetable {index}, raw"} for index in range(100)]
        foods, stats = catalog.select_foods(records)
        reverse, _ = catalog.select_foods(list(reversed(records)))
        self.assertEqual(foods, reverse)
        self.assertEqual(len(foods), catalog.PER_CATEGORY)
        self.assertEqual(stats["inputRecords"], 100)

    def test_specialized_categories_and_identified_named_products_are_excluded(self):
        baby = record()
        baby["foodCategory"]["description"] = "Baby Foods"
        named = {**record(), "fdcId": 124, "description": "Pillsbury Example Biscuit"}
        foods, stats = catalog.select_foods([baby, named, {**record(), "fdcId": 125}])
        self.assertEqual([food["id"] for food in foods], ["usda-sr-125"])
        self.assertEqual(stats["excludedCategoryRecords"], 1)
        self.assertEqual(stats["namedProductRecords"], 1)

    def test_duplicate_identifiers_fail_instead_of_replacing_a_record(self):
        with self.assertRaisesRegex(ValueError, "Duplicate FDC"):
            catalog.select_foods([record(), record()])

    def test_explicitly_named_uppercase_products_are_not_generic_foods(self):
        named = {**record(), "description": "Beverages, CYTOSPORT, Muscle Milk, ready-to-drink"}
        generic = {**record(), "fdcId": 124, "description": "Chicken, BBQ, cooked"}
        foods, _ = catalog.select_foods([named, generic])
        self.assertEqual([food["id"] for food in foods], ["usda-sr-124"])

    def test_common_whole_food_priority_survives_a_crowded_category(self):
        records = [{**record(), "fdcId": index + 1, "description": f"Short food {index}, raw"}
                   for index in range(100)]
        banana = {**record(), "fdcId": 173944, "description": "Bananas, raw"}
        foods, _ = catalog.select_foods(records + [banana])
        self.assertIn("usda-sr-173944", [food["id"] for food in foods])
        self.assertTrue(catalog.COMMON_PATTERN.search("Bananas, raw"))
        self.assertTrue(catalog.COMMON_PATTERN.search("Blueberries, raw"))


if __name__ == "__main__":
    unittest.main()
