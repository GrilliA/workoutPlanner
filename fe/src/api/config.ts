/**
 * Pages builds set VITE_API_BASE to the Railway API (`…/api`).
 * Local dev leaves it unset and uses the Vite `/api` proxy.
 * VITE_API_URL is the previous name, still honored when the new one is absent.
 */
const configuredBase = (
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined)
)
  ?.trim()
  .replace(/\/$/, "");

export const API_BASE = configuredBase ? configuredBase : "/api";
