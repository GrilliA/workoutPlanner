/**
 * Absolute API base URL — required on native (no Vite proxy).
 * Always Railway production (iOS / Android / Expo Go / EAS builds).
 */
export const API_BASE =
  "https://workoutplanner-production-974a.up.railway.app/api";

/** Sent on every request so the BE can return refresh tokens in the JSON body. */
export const MOBILE_CLIENT_HEADER = "mobile" as const;
