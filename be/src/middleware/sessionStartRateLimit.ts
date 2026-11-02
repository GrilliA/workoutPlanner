import type { NextFunction, Request, Response } from "express";
import { getAuthUser } from "../types/auth";

const WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_STARTS = 30;

type StartWindow = {
  count: number;
  resetAt: number;
};

const startsByUser = new Map<number, StartWindow>();

/**
 * Caps the sessions one user can start in a day, so a script cannot pile up sessions
 * and their sets without end. Only the start: it is always online and the phone shows
 * its error. A refused close would make the phone drop the whole session.
 */
export function sessionStartRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();

  // ponytail: one API instance on Railway; a second one would not share this counter.
  startsByUser.forEach((startWindow, userId) => {
    if (startWindow.resetAt <= now) {
      startsByUser.delete(userId);
    }
  });

  const userId = getAuthUser(req).id;
  const current = startsByUser.get(userId);

  if (current && current.count >= MAX_STARTS) {
    res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: "Too many sessions started. Try again later" });
    return;
  }

  startsByUser.set(userId, {
    count: (current?.count ?? 0) + 1,
    resetAt: current?.resetAt ?? now + WINDOW_MS,
  });

  next();
}
