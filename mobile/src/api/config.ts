/**
 * Absolute API base URL — required on native (no Vite proxy).
 * Default: Railway production (usable in Expo Go on a physical device).
 * Override locally with EXPO_PUBLIC_API_URL if you need a LAN backend.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://workoutplanner-production-974a.up.railway.app/api";

/** Sent on every request so the BE can return refresh tokens in the JSON body. */
export const MOBILE_CLIENT_HEADER = "mobile" as const;
