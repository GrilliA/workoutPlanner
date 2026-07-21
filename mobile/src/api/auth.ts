import { z } from "zod";
import { apiRequest } from "./client";
import { MOBILE_CLIENT_HEADER, API_BASE } from "./config";
import { authStore } from "../auth/authStore";
import {
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
  const result = await apiRequest("/auth/password", {
    method: "PATCH",
    body: input,
    requestSchema: changePasswordRequestSchema,
    schema: z.object({ refreshToken: z.string().optional() }).or(z.undefined()),
  });

  if (result && "refreshToken" in result && result.refreshToken) {
    await authStore.setRefreshToken(result.refreshToken);
  }
}

export async function logout(): Promise<void> {
  const refreshToken = authStore.getRefreshToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Client": MOBILE_CLIENT_HEADER,
  };

  if (refreshToken) {
    headers["Content-Type"] = "application/json";
  }

  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers,
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  });
}
