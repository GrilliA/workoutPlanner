import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ApiError, createCoachClient } from "@api";
import { AppShell } from "@components/appshell";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { CoachPageHeader } from "../../coachpageheader";
import "../../style.css";

export default function NewClientPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const client = await createCoachClient({
        email,
        password,
        name: name.trim() || undefined,
      });
      setLocation(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossibile creare il cliente");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="coach-page page-container">
        <CoachPageHeader
          title="Nuovo cliente"
          subtitle="Crea l'account atleta (password temporanea)"
        />

        <form className="coach-form" onSubmit={(event) => void handleSubmit(event)}>
          <Input.Root>
            <Input.Label>Nome</Input.Label>
            <Input.Field
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Marco Rossi"
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Email</Input.Label>
            <Input.Field
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="cliente@email.com"
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Password temporanea</Input.Label>
            <Input.Field
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="minimo 8 caratteri"
            />
          </Input.Root>

          {error ? <p className="coach-empty">{error}</p> : null}

          <Button.Root type="submit" variant="primary" loading={submitting} disabled={submitting}>
            <Button.Label>Crea cliente</Button.Label>
          </Button.Root>
        </form>
      </div>
    </AppShell>
  );
}
