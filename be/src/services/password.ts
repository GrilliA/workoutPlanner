import bcrypt from "bcrypt";
import { authConfig } from "../config/auth";

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, authConfig.bcryptRounds());

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => bcrypt.compare(password, passwordHash);
