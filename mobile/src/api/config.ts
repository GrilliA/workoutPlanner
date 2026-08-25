/**
 * Absolute API base URL — required on native (no Vite proxy).
 * Simulator/dev can override with EXPO_PUBLIC_API_URL.
 * EAS builds set the same var in eas.json (Railway production).
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://workoutplanner-production-974a.up.railway.app/api";

/** Sent on every request so the BE can return refresh tokens in the JSON body. */
export const MOBILE_CLIENT_HEADER = "mobile" as const;
