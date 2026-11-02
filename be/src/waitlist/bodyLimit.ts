import type { NextFunction, Request, Response } from "express";

export const MAX_WAITLIST_BODY_BYTES = 2048;

const TOO_LARGE = { error: "Richiesta troppo grande" };

export const rejectLargeWaitlistBody = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers["content-length"];
  if (typeof header !== "string") {
    next();
    return;
  }
  const bytes = Number(header);
  const headerIsNumber = Number.isFinite(bytes) && bytes >= 0;
  if (headerIsNumber && bytes > MAX_WAITLIST_BODY_BYTES) {
    res.status(413).json(TOO_LARGE);
    return;
  }
  next();
};

const errorType = (err: unknown): string | undefined => {
  if (typeof err !== "object" || err === null || !("type" in err)) {
    return undefined;
  }
  if (typeof err.type !== "string") {
    return undefined;
  }
  return err.type;
};

const errorStatus = (err: unknown): number | undefined => {
  if (typeof err !== "object" || err === null || !("status" in err)) {
    return undefined;
  }
  if (typeof err.status !== "number") {
    return undefined;
  }
  return err.status;
};

export const handleWaitlistBodyError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const type = errorType(err);
  if (errorStatus(err) === 413 || type === "entity.too.large") {
    res.status(413).json(TOO_LARGE);
    return;
  }
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "Richiesta non valida" });
    return;
  }
  next(err);
};
