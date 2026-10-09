import { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Project site: https://grillia.github.io/workoutPlanner/ */
const pagesBase = "/workoutPlanner/";

/**
 * GitHub Pages serves 404.html for unknown paths and keeps the requested URL.
 * Copying the built index lets wouter handle deep links such as /login.
 */
function copyIndexTo404(): Plugin {
  return {
    name: "copy-index-to-404",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      copyFileSync(path.join(dist, "index.html"), path.join(dist, "404.html"));
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const pages = mode === "pages";

  if (pages && !process.env.VITE_API_BASE?.trim()) {
    throw new Error(
      "VITE_API_BASE is required for vite build --mode pages. Set it to the Railway API URL, including /api.",
    );
  }

  return {
    base: pages ? pagesBase : "/",
    plugins: [react(), ...(pages ? [copyIndexTo404()] : [])],
    resolve: {
      alias: {
        "@api": path.resolve(__dirname, "./src/api"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@pages/*": path.resolve(__dirname, "./src/pages/*"),
        "@auth": path.resolve(__dirname, "./src/auth"),
        "@auth/*": path.resolve(__dirname, "./src/auth/*"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3005",
          changeOrigin: true,
        },
      },
    },
  };
});
