import type { AuthUser } from "@api/schemas/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
};

export type { AuthUser };
