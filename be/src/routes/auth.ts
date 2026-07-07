import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import {
  signAccessToken,
  toAuthUser,
} from "../services/accessToken";
import { hashPassword, verifyPassword } from "../services/password";
import {
  validateLoginInput,
  validateRegisterInput,
} from "../services/authValidation";
import type { AuthenticatedRequest } from "../types/auth";

export const authRouter = Router();

const INVALID_CREDENTIALS = "Invalid email or password";

authRouter.post("/register", async (req, res) => {
  const parsed = validateRegisterInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { email, password, name } = parsed.value;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, name })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  const user = toAuthUser(created);
  const accessToken = signAccessToken(user);

  res.status(201).json({ user, accessToken });
});

authRouter.post("/login", async (req, res) => {
  const parsed = validateLoginInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { email, password } = parsed.value;

  const [userRow] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!userRow) {
    res.status(401).json({ error: INVALID_CREDENTIALS });
    return;
  }

  const passwordMatches = await verifyPassword(password, userRow.passwordHash);

  if (!passwordMatches) {
    res.status(401).json({ error: INVALID_CREDENTIALS });
    return;
  }

  const user = toAuthUser(userRow);
  const accessToken = signAccessToken(user);

  res.json({ user, accessToken });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const { user } = req as AuthenticatedRequest;
  res.json({ user });
});
