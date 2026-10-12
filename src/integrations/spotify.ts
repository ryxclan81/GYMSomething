export type SpotifyAction = "play" | "pause" | "next" | "previous";
const prefix = "forma.spotify.";
interface Token {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
}
let token: Token | null = null;
let callbackPromise: Promise<boolean> | null = null;
export const spotifyConnected = () =>
  Boolean(token && token.expires_at > Date.now());
export const spotifyClientId = () =>
  localStorage.getItem(`${prefix}client`) ?? "";
export function configureSpotify(clientId: string): void {
  localStorage.setItem(`${prefix}client`, clientId.trim());
}
export function disconnectSpotify(): void {
  token = null;
  sessionStorage.removeItem(`${prefix}verifier`);
  sessionStorage.removeItem(`${prefix}state`);
}
export function openSpotify(): void {
  window.open("https://open.spotify.com", "_blank", "noopener,noreferrer");
}
const redirectUri = () => `${location.origin}${location.pathname}`;
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export async function connectSpotify(): Promise<void> {
  const clientId = spotifyClientId();
  if (!/^[a-f0-9]{32}$/i.test(clientId))
    throw new Error(
      "Enter your Spotify application Client ID. Never enter a client secret.",
    );
  if (
    location.protocol !== "https:" &&
    !["127.0.0.1", "[::1]"].includes(location.hostname)
  )
    throw new Error(
      "Spotify requires HTTPS or an explicit loopback IP. localhost is not accepted.",
    );
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  sessionStorage.setItem(`${prefix}verifier`, verifier);
  sessionStorage.setItem(`${prefix}state`, state);
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "user-modify-playback-state",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();
  location.assign(url.toString());
}
export function completeSpotifyCallback(): Promise<boolean> {
  if (callbackPromise) return callbackPromise;
  callbackPromise = (async () => {
    const params = new URLSearchParams(location.search),
      code = params.get("code"),
      state = params.get("state");
    if (!code && !params.has("error")) return false;
    const expected = sessionStorage.getItem(`${prefix}state`),
      verifier = sessionStorage.getItem(`${prefix}verifier`);
    // Only consume this app's callback. Remove credentials from address/history before network operations.
    if (!expected) return false;
    history.replaceState({}, "", location.pathname + location.hash);
    sessionStorage.removeItem(`${prefix}state`);
    sessionStorage.removeItem(`${prefix}verifier`);
    if (params.has("error"))
      throw new Error(
        "Spotify authorization was declined. Open Spotify still works.",
      );
    if (!verifier || state !== expected)
      throw new Error(
        "Spotify authorization state did not match. Please reconnect.",
      );
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: spotifyClientId(),
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
      }),
    });
    if (!response.ok)
      throw new Error(
        "Spotify authorization failed. Check your redirect URI and allowed Spotify users.",
      );
    const result = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    token = {
      access_token: result.access_token,
      expires_at: Date.now() + result.expires_in * 1000,
      refresh_token: result.refresh_token,
    };
    return true;
  })();
  return callbackPromise;
}
export async function spotifyAction(action: SpotifyAction): Promise<void> {
  if (!token)
    throw new Error("Connect Spotify in Settings or open Spotify directly.");
  if (token.expires_at <= Date.now()) {
    if (!token.refresh_token) {
      token = null;
      throw new Error("Spotify session expired. Reconnect in Settings.");
    }
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
        client_id: spotifyClientId(),
      }),
    });
    if (!response.ok) {
      token = null;
      throw new Error("Spotify session expired. Reconnect in Settings.");
    }
    const result = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    token = {
      access_token: result.access_token,
      expires_at: Date.now() + result.expires_in * 1000,
      refresh_token: result.refresh_token ?? token.refresh_token,
    };
  }
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/${action}`,
    {
      method: action === "play" || action === "pause" ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );
  if (response.ok) return;
  if (response.status === 429)
    throw new Error(
      `Spotify rate limit. Try again after ${response.headers.get("Retry-After") ?? "a few"} seconds.`,
    );
  if (response.status === 404)
    throw new Error(
      "No active Spotify device. Open Spotify and start a track first.",
    );
  if (response.status === 403)
    throw new Error(
      "Spotify playback requires Premium and an authorized developer-app user. Use Open Spotify.",
    );
  if (response.status === 401) {
    token = null;
    throw new Error("Spotify session expired. Reconnect in Settings.");
  }
  throw new Error("Spotify could not control playback. Open Spotify directly.");
}
