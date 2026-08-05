import { z } from "zod";

export const authUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.enum(["coach", "athlete"]).default("athlete"),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  /** Present for mobile clients (`X-Client: mobile`); ignored on web. */
  refreshToken: z.string().optional(),
});

export const accessTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});

export const meResponseSchema = z.object({
  user: authUserSchema,
});

export const loginRequestSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export const registerRequestSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(8),
  name: z.string().trim().optional(),
});

export const updateProfileRequestSchema = z.object({
  name: z.string().trim().nullable(),
});

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginInput = z.input<typeof loginRequestSchema>;
export type RegisterInput = z.input<typeof registerRequestSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileRequestSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordRequestSchema>;
