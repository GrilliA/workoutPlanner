import { z } from "zod";
import { apiRequest } from "./client";
import {
  accessTokenSchema,
  authSessionSchema,
  loginRequestSchema,
  meResponseSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
  changePasswordRequestSchema,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "./schemas/auth";

export function login(input: LoginInput) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: input,
    requestSchema: loginRequestSchema,
    schema: authSessionSchema,
  });
}

export function register(input: RegisterInput) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: input,
    requestSchema: registerRequestSchema,
    schema: authSessionSchema,
  });
}

export function refreshAccessToken() {
  return apiRequest("/auth/refresh", {
    method: "POST",
    schema: accessTokenSchema,
  });
}

export function getMe() {
  return apiRequest("/auth/me", {
    schema: meResponseSchema,
  });
}

export function updateProfile(input: UpdateProfileInput) {
  return apiRequest("/auth/me", {
    method: "PATCH",
    body: input,
    requestSchema: updateProfileRequestSchema,
    schema: meResponseSchema,
  });
}

export async function changePassword(
  input: Pick<ChangePasswordInput, "currentPassword" | "newPassword">,
): Promise<void> {
  await apiRequest("/auth/password", {
    method: "PATCH",
    body: input,
    schema: z.undefined(),
  });
}

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
    schema: z.undefined(),
  });
}
