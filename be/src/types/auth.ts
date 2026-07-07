import type { Request } from "express";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
