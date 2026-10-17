import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 8;

type Attempt = {
  count: number;
  resetAt: number;
};

const clientAddress = (req: Request): string => {
  if (typeof req.ip === "string" && req.ip !== "") {
    return req.ip;
  }
  return "unknown";
};

export const createWaitlistRateLimit = (options: {
  max: number;
  windowMs: number;
  now: () => number;
}) => {
  const attempts = new Map<string, Attempt>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    const now = options.now();
    const expiredKeys = [...attempts.keys()].filter((key) => {
      const attempt = attempts.get(key);
      return attempt !== undefined && attempt.resetAt <= now;
    });
    for (const key of expiredKeys) {
      attempts.delete(key);
    }

    const key = clientAddress(req);
    const current = attempts.get(key);
    if (current && current.count >= options.max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "Troppi tentativi. Riprova più tardi" });
      return;
    }

    const count = current ? current.count + 1 : 1;
    const resetAt = current ? current.resetAt : now + options.windowMs;
    attempts.set(key, { count, resetAt });
    next();
  };
};

// One process on Railway. A second instance would not share this counter.
export const waitlistRateLimit = createWaitlistRateLimit({
  max: MAX_REQUESTS,
  windowMs: WINDOW_MS,
  now: () => Date.now(),
});
