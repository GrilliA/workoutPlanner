import { Router, type Request } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { refreshTokens, users } from "../db/schema";
import { authRateLimit } from "../middleware/authRateLimit";
import { requireAuth } from "../middleware/requireAuth";
import { signAccessToken, toAuthUser } from "../services/accessToken";
import { hashPassword, verifyPassword } from "../services/password";
import {
  validateLoginInput,
  validateRegisterInput,
  validateUpdateProfileInput,
  validateChangePasswordInput,
} from "../services/authValidation";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  createRefreshSession,
  findValidRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
  setRefreshCookie,
  startAuthSession,
} from "../services/refreshToken";
import type { AuthenticatedRequest } from "../types/auth";

export const authRouter = Router();

const INVALID_CREDENTIALS = "Invalid email or password";
const UNAUTHORIZED = "Unauthorized";

/** Mobile clients send `X-Client: mobile` — they cannot rely on httpOnly cookies. */
const isMobileClient = (req: Request): boolean =>
  req.header("X-Client")?.toLowerCase() === "mobile";

const readRefreshToken = (req: Request): string | undefined => {
  const fromCookie = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

  if (fromCookie) {
    return fromCookie;
  }

  const fromBody = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof fromBody === "string" && fromBody.length > 0 ? fromBody : undefined;
};

authRouter.post("/register", authRateLimit, async (req, res) => {
  const parsed = validateRegisterInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { email, password, name } = parsed.value;
  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, name })
    .onConflictDoNothing({ target: users.email })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  if (!created) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const user = toAuthUser(created);
  const tokens = await startAuthSession(user, res, {
    includeRefreshInBody: isMobileClient(req),
  });

  res.status(201).json({ user, ...tokens });
});

authRouter.post("/login", authRateLimit, async (req, res) => {
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
  const tokens = await startAuthSession(user, res, {
    includeRefreshInBody: isMobileClient(req),
  });

  res.json({ user, ...tokens });
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = readRefreshToken(req);

  if (!refreshToken) {
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  const session = await findValidRefreshSession(refreshToken);

  if (!session) {
    clearRefreshCookie(res);
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  const [userRow] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!userRow) {
    await revokeRefreshSession(refreshToken);
    clearRefreshCookie(res);
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  const user = toAuthUser(userRow);
  const accessToken = signAccessToken(user);
  const newRefreshToken = await rotateRefreshSession(refreshToken, user.id);

  if (!newRefreshToken) {
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  setRefreshCookie(res, newRefreshToken);

  if (isMobileClient(req)) {
    res.json({ accessToken, refreshToken: newRefreshToken });
    return;
  }

  res.json({ accessToken });
});

authRouter.post("/logout", async (req, res) => {
  const refreshToken = readRefreshToken(req);

  if (refreshToken) {
    await revokeRefreshSession(refreshToken);
  }

  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const { user } = req as AuthenticatedRequest;
  res.json({ user });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const parsed = validateUpdateProfileInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.value.name ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  res.json({ user: toAuthUser(updated) });
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const parsed = validateChangePasswordInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const [userRow] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id));

  if (!userRow) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const passwordMatches = await verifyPassword(
    parsed.value.currentPassword,
    userRow.passwordHash,
  );

  if (!passwordMatches) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await hashPassword(parsed.value.newPassword);

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, user.id));

    await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));
  });

  const refreshToken = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);

  if (isMobileClient(req)) {
    res.status(200).json({ refreshToken });
    return;
  }

  res.status(204).send();
});
