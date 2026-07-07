const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const validateRegisterInput = (
  input: RegisterInput,
): { ok: true; value: RegisterInput } | { ok: false; error: string } => {
  const email = normalizeEmail(input.email);

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Invalid email" };
  }

  if (typeof input.password !== "string" || input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : undefined;

  return {
    ok: true,
    value: { email, password: input.password, name },
  };
};

export const validateLoginInput = (
  input: LoginInput,
): { ok: true; value: LoginInput } | { ok: false; error: string } => {
  const email = normalizeEmail(input.email);

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Invalid email" };
  }

  if (typeof input.password !== "string" || input.password.length === 0) {
    return { ok: false, error: "Password is required" };
  }

  return {
    ok: true,
    value: { email, password: input.password },
  };
};
