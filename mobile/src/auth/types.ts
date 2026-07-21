export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "error";

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
};
