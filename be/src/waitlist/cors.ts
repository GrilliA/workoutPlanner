import type { NextFunction, Request, Response } from "express";

export const PAGES_ORIGIN = "https://grillia.github.io";

export const parseWaitlistOrigins = (raw: string | undefined): string[] => {
  const origins = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  if (origins.length === 0) {
    return [PAGES_ORIGIN];
  }
  return origins;
};

const applyAllowedHeaders = (res: Response, origin: string): void => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Vary", "Origin");
};

/**
 * Browser calls from the landing page only. A missing Origin is a non-browser
 * client (curl, the tests) and is allowed. WAITLIST_CORS_ORIGINS replaces the
 * default, it does not append to it.
 */
export const applyWaitlistCors = (req: Request, res: Response, next: NextFunction): void => {
  const allowed = parseWaitlistOrigins(process.env.WAITLIST_CORS_ORIGINS);
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === "string" ? originHeader : undefined;
  const originAllowed = origin !== undefined && allowed.includes(origin);

  if (originAllowed && origin) {
    applyAllowedHeaders(res, origin);
  }

  if (origin !== undefined && !originAllowed) {
    res.status(403).json({ error: "Origin non consentita" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};
