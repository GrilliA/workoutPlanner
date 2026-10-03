import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "traccia.refreshToken";

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

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

/**
 * Auth token storage for React Native.
 * - access token: in-memory only (short-lived JWT)
 * - refresh token: sessionStorage on the Expo web preview (tab lifetime); Expo SecureStore on iOS/Android (encrypted keychain/keystore, survives app kill)
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

  clear: (): void => {
    accessToken = null;
    refreshTokenMemory = null;
    void refreshTokenStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    listeners.forEach((listener) => listener());
  },

  onSessionCleared: (listener: SessionListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
