import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./AuthProvider";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (status === "anonymous") {
      setLocation("/login");
    }
  }, [status, setLocation]);

  if (status === "loading" || status === "anonymous") {
    return null;
  }

  return children;
}
