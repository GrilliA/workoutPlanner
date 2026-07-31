import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { verifyAccessToken } from "../services/accessToken";
import type { AuthenticatedRequest } from "../types/auth";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role === "coach" ? "coach" : "athlete",
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
