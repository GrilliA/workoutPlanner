import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest, UserRole } from "../types/auth";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
