import { defineConfig } from "astro/config";

/**
 * GitHub Pages project site. The coach panel stays at the site root
 * (https://grillia.github.io/workoutPlanner/). This page is a subpath of
 * the same artifact, so the panel URL does not move.
 */
const pagesBase = "/workoutPlanner/landing";

const publishingToPages =
  process.env.npm_lifecycle_event === "build:pages" || process.env.LANDING_PAGES === "1";

export default defineConfig({
  output: "static",
  site: "https://grillia.github.io",
  base: publishingToPages ? pagesBase : "/",
});
