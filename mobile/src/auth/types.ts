export type UserRole = "coach" | "athlete";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "error";

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
};
