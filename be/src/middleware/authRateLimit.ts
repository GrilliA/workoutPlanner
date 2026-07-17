import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Attempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Attempt>();

const getKey = (req: Request): string => {
  const email =
    req.body && typeof req.body === "object" && typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  return `${req.path}:${req.ip}:${email}`;
};

export function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();

  // ponytail: O(n) cleanup is enough for one API instance; use a shared store when scaling out.
  attempts.forEach((attempt, key) => {
    if (attempt.resetAt <= now) {
      attempts.delete(key);
    }
  });

  const key = getKey(req);
  const current = attempts.get(key);

  if (current && current.count >= MAX_ATTEMPTS) {
    res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: "Troppi tentativi. Riprova più tardi" });
    return;
  }

  attempts.set(key, {
    count: (current?.count ?? 0) + 1,
    resetAt: current?.resetAt ?? now + WINDOW_MS,
  });

  next();
}
