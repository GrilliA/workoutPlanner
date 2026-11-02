import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { authUserSchema } from "../api/schemas/auth";
import type { AuthUser } from "./types";

const REFRESH_TOKEN_KEY = "traccia.refreshToken";
const SAVED_USER_KEY = "traccia.user";

/** expo-secure-store has no web implementation — Expo web preview uses sessionStorage (tab lifetime). */
const refreshTokenStorage =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => sessionStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => sessionStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => {
          try {
            sessionStorage.removeItem(key);
          } catch {
            // clear() does not await; a rejection here would be unhandled.
          }
        },
      }
    : SecureStore;

let accessToken: string | null = null;
let refreshTokenMemory: string | null = null;
let savedUserMemory: AuthUser | null = null;

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

/**
 * Auth token storage for React Native.
 * - access token: in-memory only (short-lived JWT)
 * - refresh token: sessionStorage on the Expo web preview (tab lifetime); Expo SecureStore on iOS/Android (encrypted keychain/keystore, survives app kill)
 * - saved user: same storage as the refresh token, so the app can open without network
 *
 * Why not cookies? RN has no browser cookie jar for httpOnly cookies like the web client.
 */
export const authStore = {
  getAccessToken: (): string | null => accessToken,

  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },

  getRefreshToken: (): string | null => refreshTokenMemory,

  setRefreshToken: async (token: string | null): Promise<void> => {
    const previousRefreshToken = refreshTokenMemory;
    refreshTokenMemory = token;

    try {
      if (token) {
        await refreshTokenStorage.setItemAsync(REFRESH_TOKEN_KEY, token);
        return;
      }

      await refreshTokenStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      refreshTokenMemory = previousRefreshToken;
      throw error;
    }
  },

  /** Load refresh token from sessionStorage (web) or SecureStore (native) into memory (call once at bootstrap). */
  hydrateRefreshToken: async (): Promise<string | null> => {
    try {
      const stored = await refreshTokenStorage.getItemAsync(REFRESH_TOKEN_KEY);
      refreshTokenMemory = stored;
      return stored;
    } catch {
      refreshTokenMemory = null;
      return null;
    }
  },

  getSavedUser: (): AuthUser | null => savedUserMemory,

  /** Best effort: a failed write only means the next offline start shows Riprova. */
  setSavedUser: async (user: AuthUser): Promise<void> => {
    savedUserMemory = user;

    try {
      await refreshTokenStorage.setItemAsync(SAVED_USER_KEY, JSON.stringify(user));
    } catch {
      // Keep the in-memory copy for this run.
    }
  },

  /** Load the user saved at the last login or refresh; a missing or broken value reads as none. */
  hydrateSavedUser: async (): Promise<AuthUser | null> => {
    try {
      const stored = await refreshTokenStorage.getItemAsync(SAVED_USER_KEY);
      const parsed = stored ? authUserSchema.safeParse(JSON.parse(stored)) : null;
      savedUserMemory = parsed?.success ? parsed.data : null;
    } catch {
      savedUserMemory = null;
    }

    return savedUserMemory;
  },

  clear: (): void => {
    accessToken = null;
    refreshTokenMemory = null;
    savedUserMemory = null;
    void refreshTokenStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    void refreshTokenStorage.deleteItemAsync(SAVED_USER_KEY);
    listeners.forEach((listener) => listener());
  },

  onSessionCleared: (listener: SessionListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
