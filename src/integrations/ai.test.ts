import { it, expect, vi, afterEach } from "vitest";
import { endpointAI, validateAIEndpoint } from "./ai";
import type { AppData } from "../domain/types";
afterEach(() => vi.unstubAllGlobals());
const data = {
  profile: {
    ai: true,
    name: "Private name",
    bodyweightKg: 75,
    focus: "Strength",
    experience: "Beginner",
    days: [1],
    duration: 60,
    unit: "kg",
  },
  aiSettings: {
    endpoint: "https://coach.example/api",
    profileConsent: false,
    historyConsent: false,
    nutritionConsent: false,
  },
  sessions: [],
  diary: [],
  nutritionTargets: { calories: 2000 },
} as unknown as AppData;
it("sends no context without separate granular consent", async () => {
  vi.stubGlobal("location", { origin: "https://forma.example" });
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ answer: "Training answer" })),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await endpointAI.ask("What is double progression?", data)).toBe(
    "Training answer",
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    question: "What is double progression?",
    context: {},
  });
});
it("excludes name, measurements and notes even with profile consent", async () => {
  vi.stubGlobal("location", { origin: "https://forma.example" });
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ answer: "Answer" })));
  vi.stubGlobal("fetch", fetch);
  await endpointAI.ask("Question", {
    ...data,
    aiSettings: { ...data.aiSettings, profileConsent: true },
  });
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.context.profile).not.toHaveProperty("name");
  expect(body.context.profile).not.toHaveProperty("bodyweightKg");
});
it("rejects credential-bearing endpoint URLs before sending data", async () => {
  vi.stubGlobal("location", { origin: "https://forma.example" });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    endpointAI.ask("Question", {
      ...data,
      aiSettings: {
        ...data.aiSettings,
        endpoint: "https://coach.example/api?key=secret",
      },
    }),
  ).rejects.toThrow(/credentials/);
  expect(fetch).not.toHaveBeenCalled();
});
it("does not use an alternate provider after a quota failure", async () => {
  vi.stubGlobal("location", { origin: "https://forma.example" });
  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
  vi.stubGlobal("fetch", fetch);
  await expect(endpointAI.ask("Question", data)).rejects.toThrow(
    /No paid fallback/,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([
  "",
  "/api/coach",
  "https://coach.example/api",
  "http://localhost:8080/coach",
  "http://127.0.0.1:8080/coach",
  "http://[::1]:8080/coach",
])("accepts supported endpoint %s", (endpoint) =>
  expect(validateAIEndpoint(endpoint)).toBe(endpoint),
);
it.each([
  "https://coach.example/api?key=secret",
  "https://user:secret@coach.example/api",
  "https://coach.example/api#secret",
  "http://remote.example/api",
  "ftp://localhost/api",
  "javascript:alert(1)",
  "//remote.example/api",
  "/\\remote.example/api",
])("rejects unsafe endpoint before it can be persisted: %s", (endpoint) =>
  expect(() => validateAIEndpoint(endpoint)).toThrow(),
);
