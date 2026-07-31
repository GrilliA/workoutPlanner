import { normalizeEmail } from "./authValidation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type CreateClientInput = {
  email: string;
  password: string;
  name?: string;
};

export const validateCreateClientInput = (
  body: unknown,
): { ok: true; value: CreateClientInput } | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const email =
    typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Invalid email" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : undefined;

  return { ok: true, value: { email, password, name } };
};

export type ResetPasswordInput = {
  password: string;
};

export const validateResetPasswordInput = (
  body: unknown,
): { ok: true; value: ResetPasswordInput } | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const password = typeof input.password === "string" ? input.password : "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  return { ok: true, value: { password } };
};
