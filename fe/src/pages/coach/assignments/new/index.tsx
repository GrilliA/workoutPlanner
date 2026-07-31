import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ApiError,
  createCoachAssignment,
  getCoachClients,
  getCoachTemplates,
  type CoachClient,
  type CoachTemplate,
} from "@api";
import { AppShell } from "@components/appshell";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { CoachPageHeader } from "../../coachpageheader";
import { SchedaTxtPaste, type ParsedScheda } from "../../schedatxt";
import { toProgramInput } from "../../programapi";
import type { Weekday } from "@pages/workouts/new/types";
import "../../style.css";

export default function NewAssignmentPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const presetAthleteId = useMemo(() => {
    const value = new URLSearchParams(search).get("athleteId");
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }, [search]);

  const [clients, setClients] = useState<CoachClient[]>([]);
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("Nuova scheda");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [parsedTxt, setParsedTxt] = useState<ParsedScheda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([getCoachClients(), getCoachTemplates()])
      .then(([clientRows, templateRows]) => {
        setClients(clientRows);
        setTemplates(templateRows);
        if (presetAthleteId) {
          setAthleteId(String(presetAthleteId));
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Errore caricamento");
      });
  }, [presetAthleteId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const days = parsedTxt
        ? parsedTxt.days.map((day) => ({
            ...day,
            weekdays: day.weekdays as Weekday[],
          }))
        : null;

      const result = await createCoachAssignment({
        athleteId: Number(athleteId),
        startsAt,
        expiresAt,
        templateId: templateId ? Number(templateId) : undefined,
        name: templateId
          ? undefined
          : parsedTxt?.name.trim() || name,
        program:
          !templateId && parsedTxt && days
            ? toProgramInput(parsedTxt.name, parsedTxt.settings, days)
            : undefined,
      });

      setLocation(
        `/clients/${athleteId}/programs/${result.workout.id}/edit`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Assegnazione fallita");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="coach-page page-container">
        <CoachPageHeader
          title="Assegna scheda"
          subtitle="Da template (copia) oppure da zero sul cliente"
        />

        <form className="coach-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Cliente
            <select
              required
              value={athleteId}
              onChange={(event) => setAthleteId(event.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
            >
              <option value="">Seleziona…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name ?? client.email}
                </option>
              ))}
            </select>
          </label>

          <label>
            Template (opzionale)
            <select
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value);
                setParsedTxt(null);
              }}
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
            >
              <option value="">Da zero</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          {!templateId ? (
            <>
              <Input.Root>
                <Input.Label>Nome scheda</Input.Label>
                <Input.Field
                  value={parsedTxt?.name ?? name}
                  onChange={(event) => {
                    setParsedTxt(null);
                    setName(event.target.value);
                  }}
                  required
                />
              </Input.Root>

              <SchedaTxtPaste
                compact
                onApply={(parsed) => {
                  setParsedTxt(parsed);
                  setName(parsed.name);
                  setError(null);
                }}
              />

              {parsedTxt ? (
                <p className="coach-empty">
                  TXT pronto: {parsedTxt.days.length} giorni,{" "}
                  {parsedTxt.days.reduce(
                    (count, day) => count + day.exercises.length,
                    0,
                  )}{" "}
                  esercizi.                   Verrà applicato in un unico passaggio all&apos;assegnazione.
                </p>
              ) : null}
            </>
          ) : null}

          <Input.Root>
            <Input.Label>Data inizio</Input.Label>
            <Input.Field
              type="date"
              required
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Data scadenza</Input.Label>
            <Input.Field
              type="date"
              required
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Input.Root>

          {error ? <p className="coach-empty">{error}</p> : null}

          <Button.Root type="submit" variant="primary" loading={submitting} disabled={submitting}>
            <Button.Label>Assegna e modifica</Button.Label>
          </Button.Root>
        </form>
      </div>
    </AppShell>
  );
}
