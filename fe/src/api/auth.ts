import { z } from "zod";
import { apiRequest } from "./client";
import {
  accessTokenSchema,
  authSessionSchema,
  loginRequestSchema,
  meResponseSchema,
  registerRequestSchema,
  type LoginInput,
  type RegisterInput,
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

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
    schema: z.undefined(),
  });
}
