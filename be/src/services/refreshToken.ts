import { and, eq, gt, isNull } from "drizzle-orm";
import type { Response } from "express";
import { db } from "../db";
import { refreshTokens } from "../db/schema";
import { authConfig } from "../config/auth";
import { generateOpaqueToken, hashOpaqueToken, signAccessToken } from "./accessToken";
import type { AuthUser } from "../types/auth";

export const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

const refreshCookieMaxAgeMs = (): number =>
  authConfig.refreshExpiresDays() * 24 * 60 * 60 * 1000;

const refreshExpiresAt = (): Date =>
  new Date(Date.now() + refreshCookieMaxAgeMs());

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshCookieMaxAgeMs(),
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
  });
};

export const createRefreshSession = async (userId: number): Promise<string> => {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt: refreshExpiresAt(),
  });

  return token;
};

export const findValidRefreshSession = async (
  token: string,
): Promise<{ id: number; userId: number } | null> => {
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();

  const [session] = await db
    .select({ id: refreshTokens.id, userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    );

  return session ?? null;
};

export const revokeRefreshSession = async (token: string): Promise<void> => {
  const tokenHash = hashOpaqueToken(token);

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
};

export const rotateRefreshSession = async (
  oldToken: string,
  userId: number,
): Promise<string | null> => {
  const oldTokenHash = hashOpaqueToken(oldToken);
  const newToken = generateOpaqueToken();
  const newTokenHash = hashOpaqueToken(newToken);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.tokenHash, oldTokenHash),
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .returning({ id: refreshTokens.id });

    if (!revoked) {
      return null;
    }

    await tx.insert(refreshTokens).values({
      userId,
      tokenHash: newTokenHash,
      expiresAt: refreshExpiresAt(),
    });

    return newToken;
  });
};

export type AuthSessionTokens = {
  accessToken: string;
  /** Present when the client asked for a body refresh token (mobile). */
  refreshToken?: string;
};

export const startAuthSession = async (
  user: AuthUser,
  res: Response,
  options?: { includeRefreshInBody?: boolean },
): Promise<AuthSessionTokens> => {
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshSession(user.id);
  // Web keeps using the httpOnly cookie; mobile also receives the opaque token in JSON.
  setRefreshCookie(res, refreshToken);

  if (options?.includeRefreshInBody) {
    return { accessToken, refreshToken };
  }

  return { accessToken };
};
