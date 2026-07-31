import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ApiError } from "@api";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandlogo";
import { Input } from "@components/input";
import { Button } from "@components/button";
import "@auth/authpage.css";

const Register = () => {
  const { register, status } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLocation("/dashboard");
    }
  }, [status, setLocation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register({
        email,
        password,
        name: name.trim() || undefined,
      });
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossibile registrarsi");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <BrandLogo size="lg" layout="stack" />
        <p className="auth-eyebrow">Area coach</p>
        <h1 className="auth-tagline">Crea il tuo account coach</h1>
        <p className="auth-support">
          Gestisci clienti, template e scadenze da un unico pannello.
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <Input.Root>
          <Input.Label>Nome</Input.Label>
          <Input.Field
            type="text"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Il tuo nome"
            autoComplete="name"
          />
        </Input.Root>

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

        <Input.Root>
          <Input.Label>Password</Input.Label>
          <Input.Field
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caratteri"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Input.Root>

        {error ? <p className="form-error">{error}</p> : null}

        <Button.Root
          variant="primary"
          type="submit"
          className="submit"
          loading={submitting}
          disabled={submitting}
        >
          <Button.Label>Crea account coach</Button.Label>
        </Button.Root>

        <p className="footer-link">
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </form>
    </main>
  );
};

export default Register;
