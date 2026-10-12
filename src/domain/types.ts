export type Unit = "kg" | "lb";
export type Focus =
  | "Hypertrophy"
  | "Strength"
  | "Endurance"
  | "Cardio"
  | "Calisthenics"
  | "General fitness"
  | "Hybrid";
export type Measurement =
  "weight-reps" | "bodyweight" | "assisted" | "duration" | "cardio";
export type Strategy =
  | "double"
  | "linear"
  | "reps"
  | "volume"
  | "rir"
  | "rpe"
  | "percentage"
  | "manual"
  | "review"
  | "skill"
  | "duration"
  | "distance";
export interface ProgressionRule {
  strategy: Strategy;
  repMin: number;
  repMax: number;
  successfulSets: number;
  sessions: number;
  incrementKg: number;
  percentage: number;
  minRir: number;
  maxRpe: number;
  minDays: number;
  plateauSessions: number;
  reviewDays: number;
}
export interface Profile {
  name: string;
  unit: Unit;
  experience: "Beginner" | "Intermediate" | "Advanced";
  focus: Focus;
  secondaryGoals: string[];
  days: number[];
  duration: number;
  split: string;
  bodyweightKg?: number;
  heightCm?: number;
  restSeconds: number;
  effort: "rir" | "rpe" | "both" | "none";
  limitations: string;
  avoid: string[];
  progression: ProgressionRule;
  nutrition: boolean;
  ai: boolean;
  voice: boolean;
  spotify: boolean;
  gamification: boolean;
  celebrations: boolean;
  indirectFactor: number;
  onboardingComplete: boolean;
  accent?: "steel" | "violet" | "neutral";
  density?: "comfortable" | "compact";
}
export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  primary: string[];
  secondary: string[];
  pattern: string;
  equipment: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  measurement: Measurement;
  load: "total" | "per-hand" | "machine" | "added" | "assistance" | "none";
  description: string;
  instructions: string[];
  mistakes: string[];
  safety: string;
  source: string;
  sourceUrl?: string;
  license: string;
  alternatives: string[];
  favorite?: boolean;
  custom?: boolean;
  archived?: boolean;
  notes?: string;
  media?: string;
  tags?: string[];
  defaultTargets?: {
    sets: number;
    repMin: number;
    repMax: number;
    durationSeconds: number;
    distanceKm: number;
    restSeconds: number;
  };
  progression?: ProgressionRule;
}
export interface EquipmentProfile {
  id: string;
  name: string;
  items: string[];
  maxDumbbellKg?: number;
  canIncline: boolean;
  notes: string;
}
export interface Prescription {
  id: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  weightKg: number;
  restSeconds: number;
  rir?: number;
  rpe?: number;
  durationSeconds: number;
  distanceKm: number;
  group: string;
  notes: string;
  rule?: ProgressionRule;
}
export interface Template {
  id: string;
  name: string;
  description: string;
  focus: Focus;
  minutes: number;
  exercises: Prescription[];
  archived?: boolean;
  updatedAt: string;
  planningSource?: {
    programId: string;
    templateId: string;
    startDate: string;
    phaseId?: string;
    lighter: boolean;
    signature: string;
  };
}
export interface ProgramPhase {
  id: string;
  name: string;
  startWeek: number;
  endWeek: number;
  repMin?: number;
  repMax?: number;
  setsMultiplier: number;
  loadMultiplier: number;
}
export interface Program {
  id: string;
  name: string;
  description: string;
  weeks: number;
  startDate: string;
  templateIds: string[];
  days: number[];
  phase: string;
  phases?: ProgramPhase[];
  deloadWeek?: number;
  archived?: boolean;
}
export interface Schedule {
  id: string;
  date: string;
  templateId: string;
  status: "planned" | "completed" | "skipped" | "rest";
  sessionId?: string;
  programId?: string;
  blockWeek?: number;
  phaseName?: string;
}
export type SetType =
  | "working"
  | "warmup"
  | "drop"
  | "amrap"
  | "failure"
  | "rest-pause"
  | "myo-reps"
  | "assisted"
  | "timed"
  | "custom";
export interface WorkoutSet {
  id: string;
  weightKg: number;
  reps: number;
  rir?: number;
  rpe?: number;
  durationSeconds: number;
  distanceKm: number;
  type: SetType;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  note?: string;
}
export interface SessionExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  prescription: Prescription;
  sets: WorkoutSet[];
  notes: string;
  originalExerciseId?: string;
}
export interface Session {
  id: string;
  templateId?: string;
  scheduleId?: string;
  name: string;
  equipmentId: string;
  startedAt: string;
  completedAt?: string;
  exercises: SessionExercise[];
  notes: string;
  difficulty?: number;
  annotation?: string;
  restEndsAt?: number;
  restPausedSeconds?: number;
  focusedExerciseId?: string;
}
export interface GoalTimeline {
  mode: "rate" | "weeks";
  /** Explicit weight used for this plan, in the goal's own unit. */
  baseline: number;
  ratePerWeek: number;
  weeks: number;
  anchorDate: string;
  deadlineMode: "estimated" | "manual";
}
export interface Goal {
  id: string;
  name: string;
  type:
    | "weight"
    | "reps"
    | "e1rm"
    | "relative"
    | "frequency"
    | "volume"
    | "duration"
    | "distance"
    | "pace"
    | "hold"
    | "skill"
    | "bodyweight"
    | "custom";
  exerciseId?: string;
  muscle?: string;
  start: number;
  current: number;
  target: number;
  unit: string;
  deadline?: string;
  timeline?: GoalTimeline;
  notes: string;
  history: { date: string; value: number }[];
}
export interface Suggestion {
  id: string;
  exerciseId: string;
  templateId?: string;
  createdAt: string;
  status: "pending" | "accepted" | "dismissed" | "snoozed";
  snoozeUntil?: string;
  strategy: Strategy;
  current: number;
  proposed: number;
  field:
    | "weightKg"
    | "repMax"
    | "sets"
    | "durationSeconds"
    | "distanceKm"
    | "review";
  reason: string;
  confidence: "low" | "moderate";
}
export interface Food {
  id: string;
  name: string;
  brand: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  barcode?: string;
  source: string;
  favorite?: boolean;
  notes?: string;
}
export interface DiaryEntry {
  id: string;
  date: string;
  meal: string;
  foodId: string;
  food: Food;
  servings: number;
}
export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: { foodId: string; servings: number }[];
}
export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}
export interface AISettings {
  endpoint: string;
  historyConsent: boolean;
  profileConsent: boolean;
  nutritionConsent: boolean;
}
export interface ReminderSettings {
  enabled: boolean;
  time: string;
  days: number[];
  quietStart: string;
  quietEnd: string;
  tone: string;
  categories: string[];
}
export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  note: string;
}
export interface AppData {
  schemaVersion: 1;
  profile: Profile;
  equipment: EquipmentProfile[];
  activeEquipmentId: string;
  exercises: Exercise[];
  templates: Template[];
  programs: Program[];
  schedule: Schedule[];
  sessions: Session[];
  activeSession: Session | null;
  goals: Goal[];
  suggestions: Suggestion[];
  foods: Food[];
  diary: DiaryEntry[];
  recipes: Recipe[];
  nutritionTargets: NutritionTargets;
  water: Record<string, number>;
  aiSettings: AISettings;
  reminders: ReminderSettings;
  bodyMetrics: BodyMetric[];
  strengthThresholds?: Record<string, { label: string; ratio: number }[]>;
  lastBackup?: string;
  updatedAt: string;
}
