import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth";
import type { AuthUser } from "../types/auth";

export type AccessTokenPayload = {
  sub: number;
  email: string;
};

export const toAuthUser = (user: {
  id: number;
  email: string;
  name: string | null;
}): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export const signAccessToken = (user: AuthUser): string =>
  jwt.sign(
    { sub: user.id, email: user.email } satisfies AccessTokenPayload,
    authConfig.accessSecret(),
    { expiresIn: authConfig.accessExpiresIn() as jwt.SignOptions["expiresIn"] },
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, authConfig.accessSecret());

  if (typeof payload === "string" || !payload.sub || !payload.email) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: Number(payload.sub),
    email: String(payload.email),
  };
};

export const generateOpaqueToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashOpaqueToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
