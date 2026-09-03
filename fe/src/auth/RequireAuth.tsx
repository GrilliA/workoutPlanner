import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { BrandLogo } from "@components/brandLogo";
import { Button } from "@components/button";
import { useAuth } from "./useAuth";
import "./authpage.css";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { status, user, retryBootstrap, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (status === "anonymous") {
      setLocation("/login", { replace: true });
    }
  }, [status, setLocation]);

  if (status === "loading") {
    return (
      <main aria-busy="true" aria-live="polite" className="auth-page">
        <div className="auth-brand">
          <BrandLogo size="md" layout="stack" />
          <p className="auth-support">Verifica della sessione…</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main role="alert" className="auth-page">
        <div className="auth-brand">
          <BrandLogo size="md" layout="stack" />
          <p className="auth-tagline">Impossibile verificare la sessione</p>
        </div>
        <div className="form">
          <Button variant="primary" type="button" onClick={retryBootstrap}>
            Riprova
          </Button>
        </div>
      </main>
    );
  }

  if (status === "anonymous") {
    return null;
  }

  if (user?.role === "athlete") {
    return (
      <main className="auth-page" role="status">
        <div className="auth-brand">
          <BrandLogo size="lg" layout="stack" />
          <p className="auth-eyebrow">App atleta</p>
          <h1 className="auth-tagline">
            L&apos;area web è riservata ai coach
          </h1>
          <p className="auth-support">
            Accedi dall&apos;app mobile per allenarti e registrare le serie.
          </p>
        </div>
        <div className="form">
          <Button
            variant="primary"
            type="button"
            className="submit"
            onClick={() => {
              void logout().then(() => setLocation("/login"));
            }}
          >
            Esci
          </Button>
        </div>
      </main>
    );
  }

  return children;
}
