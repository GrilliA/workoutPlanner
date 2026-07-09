import type { Request } from "express";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

export function getAuthUser(req: Request): AuthUser {
  return (req as AuthenticatedRequest).user;
}
