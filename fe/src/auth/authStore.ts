let accessToken: string | null = null;

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

export const authStore = {
  getAccessToken: (): string | null => accessToken,
  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    if (accessToken === null) {
      return;
    }

    accessToken = null;
    listeners.forEach((listener) => listener());
  },
  onSessionCleared: (listener: SessionListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
