import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "traccia.refreshToken";

let accessToken: string | null = null;
let refreshTokenMemory: string | null = null;

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

/**
 * Auth token storage for React Native.
 * - access token: in-memory only (short-lived JWT)
 * - refresh token: Expo SecureStore (encrypted keychain/keystore) — survives app kill
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
    refreshTokenMemory = token;

    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      return;
    }

    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  /** Load refresh token from SecureStore into memory (call once at bootstrap). */
  hydrateRefreshToken: async (): Promise<string | null> => {
    try {
      const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
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
    void SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    listeners.forEach((listener) => listener());
  },

  onSessionCleared: (listener: SessionListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
