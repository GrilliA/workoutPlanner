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

export type UpdateProfileInput = {
  name?: string | null;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export const validateUpdateProfileInput = (
  body: unknown,
):
  | { ok: true; value: UpdateProfileInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;

  if (!("name" in input)) {
    return { ok: false, error: "At least one field is required" };
  }

  if (input.name === null) {
    return { ok: true, value: { name: null } };
  }

  if (typeof input.name !== "string") {
    return { ok: false, error: "name must be a string" };
  }

  const name = input.name.trim();

  return { ok: true, value: { name: name.length > 0 ? name : null } };
};

export const validateChangePasswordInput = (
  body: unknown,
):
  | { ok: true; value: ChangePasswordInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const currentPassword =
    typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";

  if (!currentPassword) {
    return { ok: false, error: "currentPassword is required" };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: "New password must be different" };
  }

  return { ok: true, value: { currentPassword, newPassword } };
};
