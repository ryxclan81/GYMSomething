import type { AppData } from "../domain/types";
export interface AIProvider {
  ask(question: string, data: AppData, signal?: AbortSignal): Promise<string>;
}
export const disabledAI: AIProvider = {
  ask: async () => {
    throw new Error("AI is disabled. Training tools work independently.");
  },
};
/** Validate before persistence as well as before transmission; endpoint addresses are included in backups. */
export function validateAIEndpoint(input: string): string {
  const endpoint = input.trim();
  if (!endpoint) return "";
  if (/[?#\\]/.test(endpoint))
    throw new Error(
      "Do not place query parameters, fragments or credentials in the AI endpoint URL.",
    );
  if (endpoint.startsWith("//"))
    throw new Error(
      "Use a same-origin path beginning with / or a complete HTTPS endpoint.",
    );
  let url: URL;
  try {
    url = new URL(
      endpoint,
      endpoint.startsWith("/") ? "https://forma.local" : undefined,
    );
  } catch {
    throw new Error(
      "Use a same-origin path beginning with / or a complete HTTPS endpoint.",
    );
  }
  if (url.username || url.password)
    throw new Error("Do not place credentials in the AI endpoint URL.");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error(
      "An AI endpoint must use HTTPS (HTTP is allowed only on loopback).",
    );
  return endpoint;
}
/** Server endpoint owns provider credentials, quota and billing policy; this browser never accepts API keys. */
export const endpointAI: AIProvider = {
  async ask(question, data, signal) {
    if (!data.profile.ai) throw new Error("Enable AI in Settings first.");
    if (!question.trim()) throw new Error("Enter a question.");
    const endpoint = validateAIEndpoint(data.aiSettings.endpoint);
    if (!endpoint)
      throw new Error(
        "AI is not configured. Add a secure endpoint in Settings; no provider is enabled automatically.",
      );
    const url = new URL(endpoint, location.origin);
    const context: Record<string, unknown> = {};
    if (data.aiSettings.profileConsent)
      context.profile = {
        focus: data.profile.focus,
        experience: data.profile.experience,
        days: data.profile.days,
        duration: data.profile.duration,
        unit: data.profile.unit,
      };
    if (data.aiSettings.historyConsent)
      context.training = data.sessions
        .filter((s) => s.completedAt)
        .slice(-10)
        .map((s) => ({
          startedAt: s.startedAt,
          exercises: s.exercises.map((e) => ({
            name: e.exercise.name,
            sets: e.sets
              .filter((set) => set.completed)
              .map((set) => ({
                reps: set.reps,
                weightKg: set.weightKg,
                durationSeconds: set.durationSeconds,
                distanceKm: set.distanceKm,
                rir: set.rir,
                rpe: set.rpe,
              })),
          })),
        }));
    if (data.aiSettings.nutritionConsent)
      context.nutrition = {
        targets: data.nutritionTargets,
        entries: data.diary
          .slice(-50)
          .map((e) => ({
            date: e.date,
            food: e.food.name,
            servings: e.servings,
            calories: e.food.calories,
            protein: e.food.protein,
            carbs: e.food.carbs,
            fat: e.food.fat,
          })),
      };
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), context }),
      signal: signal ?? AbortSignal.timeout(30000),
    });
    if (response.status === 429)
      throw new Error("AI quota reached. No paid fallback was attempted.");
    if (!response.ok)
      throw new Error(
        "AI endpoint unavailable. Try again later; your records are unchanged.",
      );
    const result = (await response.json()) as { answer?: unknown };
    if (typeof result.answer !== "string" || !result.answer.trim())
      throw new Error("AI endpoint returned an invalid response.");
    return result.answer;
  },
};
