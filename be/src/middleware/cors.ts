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
] as const;

const parseExtraOrigins = (): string[] =>
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set<string>([...DEFAULT_ORIGINS, ...parseExtraOrigins()]);

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
