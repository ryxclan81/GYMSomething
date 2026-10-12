import type {
  AppData,
  Exercise,
  Focus,
  Prescription,
  ProgressionRule,
  Template,
} from "../domain/types";
import { dateKey, id } from "../domain/helpers";
import { equipmentOptions, starterExercises } from "./exercises";
import { defaultWorkoutIcons } from "../domain/workoutIcons";

export const defaultRule: ProgressionRule = {
  strategy: "double",
  repMin: 8,
  repMax: 12,
  successfulSets: 3,
  sessions: 2,
  incrementKg: 2.5,
  percentage: 5,
  minRir: 0,
  maxRpe: 10,
  minDays: 7,
  plateauSessions: 4,
  reviewDays: 14,
};

function exercise(name: string): Exercise {
  const result = starterExercises.find((item) => item.name === name);
  if (!result)
    throw new Error(`Starter template references a missing exercise: ${name}`);
  return result;
}

function prescribed(
  name: string,
  sets = 3,
  repMin = 8,
  repMax = 12,
): Prescription {
  const item = exercise(name),
    timed = item.measurement === "duration",
    cardio = item.measurement === "cardio";
  return {
    id: id(),
    exerciseId: item.id,
    sets: cardio ? 1 : sets,
    repMin: timed || cardio ? 0 : repMin,
    repMax: timed || cardio ? 0 : repMax,
    weightKg: 0,
    restSeconds: repMax <= 6 ? 180 : 90,
    durationSeconds: cardio ? 1200 : timed ? 30 : 0,
    distanceKm: 0,
    group: "",
    notes: item.notes ?? "",
    rule:
      timed || cardio
        ? {
            ...defaultRule,
            strategy: "duration",
            successfulSets: cardio ? 1 : sets,
            minDays: 7,
          }
        : {
            ...defaultRule,
            strategy:
              item.measurement === "bodyweight" && item.load === "none"
                ? "skill"
                : "double",
            successfulSets: sets,
            repMin,
            repMax,
          },
  };
}

function template(
  key: string,
  name: string,
  description: string,
  focus: Focus,
  minutes: number,
  entries: (string | [string, number, number, number])[],
  now: string,
): Template {
  return {
    id: key,
    name,
    description,
    focus,
    icon: defaultWorkoutIcons[key],
    minutes,
    exercises: entries.map((entry) =>
      typeof entry === "string" ? prescribed(entry) : prescribed(...entry),
    ),
    updatedAt: now,
  };
}

export function defaultData(): AppData {
  const now = new Date().toISOString();
  const templates: Template[] = [
    template(
      "tpl-full-a",
      "Full Body A",
      "A simple foundation: squat, push, pull and core. Choose comfortable starting loads; all targets are editable.",
      "General fitness",
      50,
      [
        "Barbell Full Squat",
        "Dumbbell Bench Press",
        "One-Arm Dumbbell Row",
        ["Plank", 3, 0, 0],
      ],
      now,
    ),
    template(
      "tpl-full-b",
      "Full Body B",
      "A complementary full-body session with a hip hinge and vertical movements.",
      "General fitness",
      50,
      [
        "Romanian Deadlift",
        "Dumbbell Shoulder Press",
        "Close-Grip Front Lat Pulldown",
        "Bodyweight Squat",
      ],
      now,
    ),
    template(
      "tpl-upper-a",
      "Upper Body A",
      "Horizontal and vertical upper-body work. Adjust total sets to your training experience and recovery.",
      "Hypertrophy",
      60,
      [
        "Barbell Bench Press - Medium Grip",
        "One-Arm Dumbbell Row",
        "Dumbbell Shoulder Press",
        "Close-Grip Front Lat Pulldown",
        ["Side Lateral Raise", 2, 12, 15],
        ["Dumbbell Bicep Curl", 2, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-lower-a",
      "Lower Body A",
      "Squat-focused lower-body work with a hip hinge, calves and core.",
      "Hypertrophy",
      55,
      [
        "Barbell Full Squat",
        "Romanian Deadlift",
        "Lying Leg Curls",
        ["Standing Calf Raises", 3, 10, 15],
        ["Plank", 3, 0, 0],
      ],
      now,
    ),
    template(
      "tpl-upper-b",
      "Upper Body B",
      "Dumbbell pressing and cable pulling with arm accessories.",
      "Hypertrophy",
      55,
      [
        "Dumbbell Bench Press",
        "Seated Cable Rows",
        "Close-Grip Front Lat Pulldown",
        ["Side Lateral Raise", 2, 12, 15],
        ["Triceps Pushdown", 2, 10, 15],
        ["Hammer Curls", 2, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-lower-b",
      "Lower Body B",
      "A complementary lower-body session. Technique comes before load.",
      "Hypertrophy",
      55,
      [
        "Barbell Deadlift",
        "Leg Press",
        ["Split Squat with Dumbbells", 2, 8, 12],
        "Lying Leg Curls",
        ["Standing Calf Raises", 3, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-push",
      "Push",
      "Chest, shoulder and triceps session.",
      "Hypertrophy",
      50,
      [
        "Barbell Bench Press - Medium Grip",
        "Dumbbell Shoulder Press",
        "Dumbbell Bench Press",
        ["Side Lateral Raise", 2, 12, 15],
        ["Triceps Pushdown", 2, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-pull",
      "Pull",
      "Back and elbow flexion. Keep unilateral sides as separate logged sets.",
      "Hypertrophy",
      50,
      [
        "Close-Grip Front Lat Pulldown",
        "One-Arm Dumbbell Row",
        "Seated Cable Rows",
        ["Dumbbell Bicep Curl", 2, 10, 15],
        ["Hammer Curls", 2, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-legs",
      "Legs",
      "An editable lower-body session for a push/pull/legs split.",
      "Hypertrophy",
      55,
      [
        "Barbell Full Squat",
        "Romanian Deadlift",
        "Leg Press",
        "Lying Leg Curls",
        ["Standing Calf Raises", 3, 10, 15],
      ],
      now,
    ),
    template(
      "tpl-strength",
      "Strength Foundation",
      "Low-repetition practice of three basic barbell lifts. Use safeties and leave room for controlled repetitions.",
      "Strength",
      60,
      [
        ["Barbell Full Squat", 3, 3, 5],
        ["Barbell Bench Press - Medium Grip", 3, 3, 5],
        ["Barbell Deadlift", 2, 3, 5],
      ],
      now,
    ),
    template(
      "tpl-bodyweight",
      "Bodyweight Foundation",
      "A minimal-equipment session. A pull-up bar is required for pull-ups; use a compatible substitute when unavailable.",
      "Calisthenics",
      35,
      [
        ["Pushups", 3, 6, 12],
        ["Pullups", 3, 3, 8],
        ["Bodyweight Squat", 3, 12, 20],
        ["Plank", 3, 0, 0],
      ],
      now,
    ),
    template(
      "tpl-general",
      "General Fitness",
      "Simple strength work plus an easy cardio block. Effort and duration are editable.",
      "General fitness",
      40,
      [
        ["Bodyweight Squat", 2, 10, 15],
        ["Pushups", 2, 6, 12],
        ["One-Arm Dumbbell Row", 2, 8, 12],
        "Walking, Treadmill",
      ],
      now,
    ),
    template(
      "tpl-hybrid",
      "Strength + Cardio",
      "Two strength movements and manually logged cycling. Adjust cardio effort to support your priorities.",
      "Hybrid",
      50,
      [
        ["Barbell Full Squat", 3, 5, 8],
        ["Dumbbell Bench Press", 3, 6, 10],
        "Bicycling, Stationary",
      ],
      now,
    ),
    template(
      "tpl-upper-short",
      "Upper Body A · Short",
      "An abbreviated version prioritizing a push and a pull. This is a separate editable template.",
      "Hypertrophy",
      30,
      [
        "Barbell Bench Press - Medium Grip",
        "One-Arm Dumbbell Row",
        ["Dumbbell Shoulder Press", 2, 8, 12],
      ],
      now,
    ),
    template(
      "tpl-home",
      "Home Essentials",
      "Dumbbell and floor work. Edit equipment and starting loads to match your actual home setup.",
      "General fitness",
      35,
      [
        "Dumbbell Squat",
        "Pushups",
        "Bent Over Two-Dumbbell Row",
        ["Plank", 3, 0, 0],
      ],
      now,
    ),
  ];
  return {
    schemaVersion: 1,
    profile: {
      name: "",
      unit: "lb",
      experience: "Beginner",
      focus: "General fitness",
      secondaryGoals: [],
      days: [1, 3, 5],
      duration: 50,
      split: "Full body",
      restSeconds: 90,
      effort: "rir",
      limitations: "",
      avoid: [],
      progression: { ...defaultRule },
      nutrition: false,
      ai: false,
      voice: false,
      spotify: false,
      gamification: true,
      celebrations: true,
      indirectFactor: 0.5,
      onboardingComplete: false,
    },
    equipment: [
      {
        id: "eq-gym",
        name: "Commercial Gym",
        items: equipmentOptions.filter(
          (item) => !["No equipment", "Bicycle"].includes(item),
        ),
        canIncline: true,
        notes:
          "Example full gym inventory. Remove equipment that your gym does not provide.",
      },
      {
        id: "eq-home",
        name: "Home Essentials",
        items: ["Dumbbells", "Exercise mat"],
        canIncline: false,
        notes:
          "Example minimal inventory. Edit this profile to match your available equipment and dumbbell limits.",
      },
      {
        id: "eq-travel",
        name: "Bodyweight / Travel",
        items: ["No equipment"],
        canIncline: false,
        notes:
          "Floor-based training; no resistance or support equipment assumed.",
      },
    ],
    activeEquipmentId: "eq-gym",
    exercises: structuredClone(starterExercises),
    templates,
    programs: [
      {
        id: "prg-full",
        name: "Full Body · 3 days",
        description:
          "Alternate A and B across your chosen days. Starting template, not a guaranteed optimal prescription.",
        weeks: 6,
        startDate: dateKey(),
        templateIds: ["tpl-full-a", "tpl-full-b"],
        days: [1, 3, 5],
        phase: "Foundation",
        deloadWeek: 6,
      },
      {
        id: "prg-upperlower",
        name: "Upper / Lower · 4 days",
        description:
          "Two upper and two lower sessions with planned recovery days.",
        weeks: 8,
        startDate: dateKey(),
        templateIds: [
          "tpl-upper-a",
          "tpl-lower-a",
          "tpl-upper-b",
          "tpl-lower-b",
        ],
        days: [1, 2, 4, 5],
        phase: "Build",
        deloadWeek: 8,
      },
      {
        id: "prg-ppl",
        name: "Push / Pull / Legs",
        description:
          "A flexible three-day split. Repeat only if it fits your recovery and preferences.",
        weeks: 6,
        startDate: dateKey(),
        templateIds: ["tpl-push", "tpl-pull", "tpl-legs"],
        days: [1, 3, 5],
        phase: "Build",
      },
      {
        id: "prg-five",
        name: "Hypertrophy · 5 days",
        description:
          "Upper/lower/push/pull/legs. Adjust volume and use rest days; this workload may be unnecessary for beginners.",
        weeks: 8,
        startDate: dateKey(),
        templateIds: [
          "tpl-upper-a",
          "tpl-lower-a",
          "tpl-push",
          "tpl-pull",
          "tpl-legs",
        ],
        days: [1, 2, 4, 5, 6],
        phase: "Build",
        deloadWeek: 8,
      },
      {
        id: "prg-strength",
        name: "Strength Foundation",
        description:
          "Practice main lifts three days per week, with editable loads and conservative pending progression.",
        weeks: 6,
        startDate: dateKey(),
        templateIds: ["tpl-strength"],
        days: [1, 3, 5],
        phase: "Strength",
        deloadWeek: 6,
      },
      {
        id: "prg-bodyweight",
        name: "Bodyweight Foundation",
        description:
          "Three bodyweight sessions per week. Substitute pulls only when your available equipment permits.",
        weeks: 4,
        startDate: dateKey(),
        templateIds: ["tpl-bodyweight"],
        days: [1, 3, 5],
        phase: "Skill practice",
      },
      {
        id: "prg-general",
        name: "General Fitness",
        description:
          "A manageable three-day strength and cardio starting point.",
        weeks: 6,
        startDate: dateKey(),
        templateIds: ["tpl-general"],
        days: [1, 3, 5],
        phase: "Foundation",
      },
      {
        id: "prg-hybrid",
        name: "Hybrid · Strength + Cardio",
        description:
          "Combine strength and cardio without requiring a wearable.",
        weeks: 6,
        startDate: dateKey(),
        templateIds: ["tpl-hybrid", "tpl-full-b", "tpl-general"],
        days: [1, 3, 6],
        phase: "Hybrid",
      },
      {
        id: "prg-home",
        name: "Home Essentials",
        description:
          "A floor and dumbbell program using your edited home inventory.",
        weeks: 4,
        startDate: dateKey(),
        templateIds: ["tpl-home"],
        days: [1, 3, 5],
        phase: "Foundation",
      },
    ],
    schedule: [],
    sessions: [],
    activeSession: null,
    goals: [],
    suggestions: [],
    foods: [],
    diary: [],
    recipes: [],
    nutritionTargets: {
      calories: 2000,
      protein: 120,
      carbs: 230,
      fat: 60,
      waterMl: 2000,
    },
    water: {},
    aiSettings: {
      endpoint: "",
      historyConsent: false,
      profileConsent: false,
      nutritionConsent: false,
    },
    reminders: {
      enabled: false,
      time: "18:00",
      days: [1, 3, 5],
      quietStart: "22:00",
      quietEnd: "08:00",
      tone: "friendly",
      categories: ["scheduled", "weekly"],
    },
    bodyMetrics: [],
    updatedAt: now,
  };
}
