export type VoiceCommand =
  | { kind: "log"; reps?: number; weight?: number; unit?: "kg" | "lb" }
  | { kind: "weight"; weight: number; unit?: "kg" | "lb" }
  | { kind: "rest"; seconds: number }
  | { kind: "add-set" | "skip" | "next" | "history" | "remaining" | "finish" };

const words: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, (mark) => (mark === "." ? "." : " "))
    .replace(/-/g, " ")
    .replace(
      /\b(one|two|three|four|five|six|seven|eight|nine) hundred(?: and)?(?: (twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))?(?: (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen))?\b/g,
      (_all: string, h: string, t?: string, u?: string) =>
        String(words[h] * 100 + (t ? words[t] : 0) + (u ? words[u] : 0)),
    )
    .replace(
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/g,
      (_all: string, a: string, b: string) => String(words[a] + words[b]),
    )
    .replace(/\b[a-z]+\b/g, (word) =>
      word in words ? String(words[word]) : word,
    )
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
}
/** Conservative, deterministic parsing. Callers confirm destructive commands and display a preview. */
export function parseVoiceCommand(input: string): VoiceCommand | null {
  if (/-\s*\d/.test(input)) return null;
  const t = normalize(input);
  if (/\b(hundred|thousand|million|negative|minus)\b/.test(t)) return null;
  if (/\b(kg|kilograms?|kilos?)\b/.test(t) && /\b(lb|lbs|pounds?)\b/.test(t))
    return null;
  const unit: "kg" | "lb" | undefined = /\b(kg|kilograms?|kilos?)\b/.test(t)
    ? "kg"
    : /\b(lb|lbs|pounds?)\b/.test(t)
      ? "lb"
      : undefined;
  const reps = t.match(/\b(\d+)\s*(?:reps?|repetitions?)\b/);
  const load =
    t.match(/\b(?:at|weight to|weight is|weight of)\s+(\d+(?:\.\d+)?)/) ??
    t.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?|lb|lbs|pounds?)\b/);
  if (/\b(rest|timer)\b/.test(t) && /\b(start|set|rest)\b/.test(t)) {
    const min = t.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/),
      sec = t.match(/(\d+)\s*(?:seconds?|secs?)\b/);
    const seconds =
      (min ? Number(min[1]) * 60 : 0) + (sec ? Number(sec[1]) : 0);
    return seconds > 0 && seconds <= 3600 ? { kind: "rest", seconds } : null;
  }
  if (/^(?:change|set)(?: the)? weight\b/.test(t) && load)
    return Number(load[1]) <= 2000
      ? { kind: "weight", weight: Number(load[1]), unit }
      : null;
  if (reps && /\b(log|did|reps?|repetitions?|complete)\b/.test(t)) {
    const n = Number(reps[1]),
      weight = load ? Number(load[1]) : undefined;
    return n > 0 && n <= 1000 && (weight === undefined || weight <= 2000)
      ? { kind: "log", reps: n, weight, unit }
      : null;
  }
  if (/^(add|another)(?: another)? set$/.test(t)) return { kind: "add-set" };
  if (/^skip(?: this| the| current)? exercise$/.test(t))
    return { kind: "skip" };
  if (/^(what'?s next|next exercise|what is next)$/.test(t))
    return { kind: "next" };
  if (/\b(last time|previous workout)\b/.test(t)) return { kind: "history" };
  if (/\bsets (?:are )?left\b/.test(t)) return { kind: "remaining" };
  if (/^(finish|end|complete)(?: the| my)? workout$/.test(t))
    return { kind: "finish" };
  return null;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
function constructor(): (new () => Recognition) | undefined {
  const scope = globalThis as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}
export function speechSupported(): boolean {
  return Boolean(constructor());
}
/** One utterance only; never continuous listening. Browser service may process audio remotely. */
export function startSpeech(
  onResult: (text: string) => void,
  onError: (message: string) => void,
): () => void {
  const Speech = constructor();
  if (!Speech) {
    onError(
      "Speech recognition is unavailable in this browser. Use the text command or log manually.",
    );
    return () => {};
  }
  const recognition = new Speech();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript;
    if (transcript) onResult(transcript);
  };
  recognition.onerror = (e) =>
    onError(
      e.error === "not-allowed"
        ? "Microphone permission was denied. Enable it in browser settings or use manual input."
        : `Speech recognition stopped (${e.error}). Your workout has not changed.`,
    );
  try {
    recognition.start();
  } catch {
    onError("Speech recognition could not start. Try manual input.");
  }
  return () => recognition.abort();
}
