import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ApiError } from "@api";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandLogo";
import { Input } from "@components/input";
import { Button } from "@components/button";
import "@auth/authpage.css";

const Login = () => {
  const { login, status } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLocation("/dashboard", { replace: true });
    }
  }, [status, setLocation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      setLocation("/dashboard");
    } catch (err) {
      setError(ApiError.messageFrom(err, "Impossibile accedere"));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "authenticated") {
    return null;
  }

  if (status === "loading") {
    return (
      <main aria-busy="true" aria-live="polite" className="auth-page">
        <div className="auth-brand">
          <BrandLogo size="md" layout="stack" />
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <BrandLogo size="lg" layout="stack" />
        <p className="auth-eyebrow">Area coach</p>
        <h1 className="auth-tagline">
          Visualizza il percorso. Guida i tuoi atleti.
        </h1>
        <p className="auth-support">
          Accedi al pannello per clienti, schede e scadenze.
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <Input
          id="login-email"
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <div className="password">
          <Input
            id="login-password"
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <Button
          variant="primary"
          type="submit"
          className="submit"
          loading={submitting}
        >
          Accedi
        </Button>

        <p className="footer-link">
          Non hai un account coach? <Link href="/register">Registrati</Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
