import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, refreshAccessToken } from "@api";
import * as authApi from "@api/auth";
import { authStore } from "./authStore";
import type { AuthState, AuthUser } from "./types";
import type { LoginInput, RegisterInput } from "@api/schemas/auth";

type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  retryBootstrap: () => void;
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

const errorState = (): AuthState => ({
  status: "error",
  user: null,
});

async function bootstrapSession(): Promise<AuthState> {
  try {
    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      return anonymousState();
    }

    const { user } = await authApi.getMe();
    return authenticatedState(user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      authStore.clear();
      return anonymousState();
    }

    authStore.setAccessToken(null);
    return errorState();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });
  const [bootstrapId, setBootstrapId] = useState(0);

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
  }, [bootstrapId]);

  useEffect(() => {
    return authStore.onSessionCleared(() => {
      setState(anonymousState());
    });
  }, []);

  const login = async (input: LoginInput) => {
    const { user, accessToken } = await authApi.login(input);
    authStore.setAccessToken(accessToken);
    setState(authenticatedState(user));
  };

  const register = async (input: RegisterInput) => {
    const { user, accessToken } = await authApi.register(input);
    authStore.setAccessToken(accessToken);
    setState(authenticatedState(user));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      authStore.clear();
      setState(anonymousState());
    }
  };

  const setUser = (user: AuthUser) => {
    setState(authenticatedState(user));
  };

  const retryBootstrap = () => {
    setState({ status: "loading", user: null });
    setBootstrapId((current) => current + 1);
  };

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    setUser,
    retryBootstrap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
