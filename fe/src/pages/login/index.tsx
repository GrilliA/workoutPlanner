import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ApiError } from "@api";
import { useAuth } from "@auth";
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
      setLocation("/");
    }
  }, [status, setLocation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      setLocation("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossibile accedere");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <main className="auth-page">
      <div className="logo">LOGO</div>
      <form className="form" onSubmit={handleSubmit}>
        <Input.Root>
          <Input.Label>Email</Input.Label>
          <Input.Field
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Input.Root>

        <div className="password">
          <Input.Root>
            <Input.Label>Password</Input.Label>
            <Input.Field
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </Input.Root>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <Button.Root
          variant="primary"
          type="submit"
          className="submit"
          loading={submitting}
          disabled={submitting}
        >
          <Button.Label>Accedi</Button.Label>
        </Button.Root>

        <p className="footer-link">
          Non hai un account? <Link href="/register">Registrati</Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
