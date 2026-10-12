import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const requestedBase = env.VITE_BASE_PATH?.trim() || "/";
  if (
    !requestedBase.startsWith("/") ||
    requestedBase.startsWith("//") ||
    /[?#\\\s]/.test(requestedBase) ||
    requestedBase
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  )
    throw new Error(
      "VITE_BASE_PATH must be an absolute URL path, such as / or /GYMSomething/.",
    );
  const base = requestedBase.endsWith("/")
    ? requestedBase
    : `${requestedBase}/`;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icons/*.png", "favicon.svg"],
        manifest: {
          name: "Setwise — Thoughtful training",
          short_name: "Setwise",
          description: "Your local-first personal training companion.",
          theme_color: "#090b0f",
          background_color: "#090b0f",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: base,
          scope: base,
          icons: [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,json}"],
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 4_000_000,
        },
      }),
    ],
    server: { host: "0.0.0.0" },
    preview: { host: "0.0.0.0" },
    build: { chunkSizeWarningLimit: 700 },
  };
});
