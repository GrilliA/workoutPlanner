const DEFAULT_ACCESS_EXPIRES = "15m";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const authConfig = {
  accessSecret: () => requireEnv("JWT_ACCESS_SECRET"),
  accessExpiresIn: () => process.env.JWT_ACCESS_EXPIRES ?? DEFAULT_ACCESS_EXPIRES,
  refreshExpiresDays: () => Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? "7"),
  resetExpiresHours: () => Number(process.env.RESET_TOKEN_EXPIRES_HOURS ?? "1"),
  resetLinkBase: () =>
    process.env.RESET_LINK_BASE ?? "http://localhost:5173/reset-password",
  bcryptRounds: () => Number(process.env.BCRYPT_ROUNDS ?? "12"),
};
