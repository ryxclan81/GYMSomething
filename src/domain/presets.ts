import { starterTemplates } from "../data/defaults";
import {
  equipmentCompatibility,
  substitutions,
  substitutionDetails,
} from "./engine";
import { dateKey } from "./helpers";
import type {
  AppData,
  EquipmentProfile,
  Exercise,
  Profile,
  Program,
  Template,
} from "./types";

export interface PresetRecommendation {
  templates: Template[];
  program: Program;
  reason: string;
}

/** A small starting rotation, with only movements supported by the chosen inventory. */
export function recommendPresets(
  profile: Profile,
  equipment: EquipmentProfile,
  exercises: Exercise[],
): PresetRecommendation {
  const catalog = starterTemplates();
  const strength = profile.focus === "Strength";
  const bodyweight = profile.focus === "Calisthenics";
  const conditioning = ["Cardio", "Endurance", "Hybrid"].includes(
    profile.focus,
  );
  const upperLower =
    profile.focus === "Hypertrophy" &&
    profile.experience !== "Beginner" &&
    profile.days.length >= 4 &&
    profile.duration >= 40;
  const hasGym = equipment.items.some((item) =>
    ["Barbell", "Squat rack", "Cable machine", "Functional trainer"].includes(
      item,
    ),
  );
  const keys = bodyweight
    ? ["tpl-bodyweight"]
    : strength && hasGym
      ? ["tpl-strength"]
      : upperLower && hasGym
        ? ["tpl-upper-a", "tpl-lower-a", "tpl-upper-b", "tpl-lower-b"]
        : conditioning
          ? ["tpl-general", "tpl-hybrid"]
          : hasGym
            ? ["tpl-full-a", "tpl-full-b"]
            : ["tpl-home"];
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const allowed = exercises.filter(
    (exercise) =>
      !exercise.archived &&
      !profile.avoid.includes(exercise.id) &&
      rank[exercise.difficulty] <= rank[profile.experience],
  );
  const templates = keys
    .map((key) => {
      const source = catalog.find((template) => template.id === key)!;
      const template = structuredClone(source);
      const chosen = new Set<string>();
      template.exercises = source.exercises.flatMap((target) => {
        const original = exercises.find(
          (exercise) => exercise.id === target.exerciseId,
        );
        if (!original) return [];
        const compatible =
          allowed.includes(original) &&
          equipmentCompatibility(original, equipment, target.weightKg)
            .compatible;
        const exercise = compatible
          ? original
          : substitutions(original, allowed, equipment, profile.avoid).find(
              (candidate) =>
                substitutionDetails(original, candidate).kind === "movement" &&
                !chosen.has(candidate.id),
            );
        if (!exercise || chosen.has(exercise.id)) return [];
        chosen.add(exercise.id);
        const sets =
          profile.experience === "Beginner"
            ? Math.min(2, target.sets)
            : target.sets;
        return [
          {
            ...structuredClone(target),
            exerciseId: exercise.id,
            sets,
            weightKg: 0,
            rule: target.rule
              ? { ...target.rule, successfulSets: sets }
              : undefined,
          },
        ];
      });
      const movementLimit = Math.max(2, Math.floor(profile.duration / 8));
      template.exercises = template.exercises.slice(0, movementLimit);
      template.minutes = Math.min(template.minutes, profile.duration);
      template.focus = profile.focus;
      const changed =
        template.exercises.length !== source.exercises.length ||
        template.exercises.some(
          (entry, index) =>
            entry.exerciseId !== source.exercises[index]?.exerciseId,
        );
      if (changed) {
        template.name = bodyweight
          ? "Floor Bodyweight"
          : `${source.name} · adapted`;
        template.description =
          "A starting session using your available equipment. Movements that need unavailable equipment are omitted or replaced with the same movement pattern. Review the targets and add any priorities of your own.";
      }
      return template;
    })
    .filter((template) => template.exercises.length > 0);
  const name = bodyweight
    ? "Bodyweight rotation"
    : strength
      ? "Strength rotation"
      : upperLower
        ? "Upper / lower rotation"
        : conditioning
          ? "Strength + conditioning rotation"
          : "Full body rotation";
  return {
    templates,
    program: {
      id: `preset-${equipment.id}-${profile.focus.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      description:
        "A reusable rotation of your selected starter workouts. Choose a calendar range when you schedule it.",
      startDate: dateKey(),
      templateIds: templates.map((template) => template.id),
      days: [...profile.days],
      phase: profile.focus,
    },
    reason: `Matched to ${profile.focus.toLowerCase()}, ${profile.experience.toLowerCase()} experience, ${equipment.name}, ${profile.days.length} training ${profile.days.length === 1 ? "day" : "days"} and up to ${profile.duration} minutes per session. These are editable starting points; they do not include completed history.`,
  };
}

/** Never replaces a user's saved edits, schedules, or session snapshots. */
export function addRecommendedPresets(
  data: AppData,
  recommendation: PresetRecommendation,
) {
  const added = recommendation.templates.filter(
    (template) => !data.templates.some((saved) => saved.id === template.id),
  );
  data.templates.unshift(...structuredClone(added));
  if (
    recommendation.templates.length &&
    !data.programs.some((program) => program.id === recommendation.program.id)
  )
    data.programs.unshift(structuredClone(recommendation.program));
  return added.length;
}
