import type { NextFunction, Request, Response } from "express";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Expo web / Metro
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  // GitHub Pages project site. The path /workoutPlanner/ is not part of the origin.
  "https://grillia.github.io",
] as const;

const parseExtraOrigins = (): string[] =>
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set<string>([...DEFAULT_ORIGINS, ...parseExtraOrigins()]);

/**
 * SameSite=None cookies are sent from any site. Browser POSTs always include
 * Origin, and that origin must be allowed before we set or use the refresh cookie.
 * A missing Origin is a non-browser client (native app, curl) and is allowed.
 */
export const sessionRequestOriginAllowed = (origin: unknown): boolean => {
  if (origin === undefined) {
    return true;
  }

  return typeof origin === "string" && allowedOrigins.has(origin);
};

export const applyCors = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Accept, X-Client",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};
