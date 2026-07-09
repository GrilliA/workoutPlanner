import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@api";
import * as authApi from "@api/auth";
import { authStore } from "./authStore";
import type { AuthState, AuthUser } from "./types";
import type { LoginInput, RegisterInput } from "@api/schemas/auth";

type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const anonymousState = (): AuthState => ({
  status: "anonymous",
  user: null,
});

const authenticatedState = (user: AuthUser): AuthState => ({
  status: "authenticated",
  user,
});

async function bootstrapSession(): Promise<AuthState> {
  try {
    const { accessToken } = await authApi.refreshAccessToken();
    authStore.setAccessToken(accessToken);
    const { user } = await authApi.getMe();
    return authenticatedState(user);
  } catch (error) {
    authStore.clear();

    if (error instanceof ApiError && error.status === 401) {
      return anonymousState();
    }

    return anonymousState();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    void bootstrapSession().then((nextState) => {
      if (!cancelled) {
        setState(nextState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user, accessToken } = await authApi.login(input);
    authStore.setAccessToken(accessToken);
    setState(authenticatedState(user));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user, accessToken } = await authApi.register(input);
    authStore.setAccessToken(accessToken);
    setState(authenticatedState(user));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      authStore.clear();
      setState(anonymousState());
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
    }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
