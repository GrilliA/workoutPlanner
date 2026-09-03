import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { ApiError, createCoachAssignment } from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { toast } from "@components/toast";
import { PageHeader } from "@components/pageHeader";
import { SchedaTxtPaste } from "@pages/workouts/new/schedatxt";
import type { ParsedScheda } from "@pages/workouts/new/schedatxt/parseSchedaTxt";
import { toProgramInput } from "../../programapi";
import type { Weekday } from "@pages/workouts/new/types";
import { useAssignmentOptions } from "./api/useAssignmentOptions";
import "../../style.css";

export default function NewAssignmentPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const presetAthleteId = useMemo(() => {
    const value = new URLSearchParams(search).get("athleteId");
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }, [search]);

  const { clients, templates, loading } = useAssignmentOptions();
  const [athleteId, setAthleteId] = useState(
    presetAthleteId ? String(presetAthleteId) : "",
  );
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("Nuova scheda");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [parsedTxt, setParsedTxt] = useState<ParsedScheda | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

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

      toast.success("Scheda assegnata");
      setLocation(
        `/clients/${athleteId}/programs/${result.workout.id}/edit`,
      );
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Assegnazione fallita"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="coach-page page-container">
      <PageHeader
        title="Assegna scheda"
        subtitle="Da template (copia) oppure da zero sul cliente"
      />

      {loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : (
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
            <Input
              id="assignment-workout-name"
              label="Nome scheda"
              value={parsedTxt?.name ?? name}
              onChange={(event) => {
                setParsedTxt(null);
                setName(event.target.value);
              }}
              required
            />

            <SchedaTxtPaste
              compact
              onApply={(parsed) => {
                setParsedTxt(parsed);
                setName(parsed.name);
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

        <Input
          id="assignment-start-date"
          label="Data inizio"
          type="date"
          required
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
        />

        <Input
          id="assignment-expires-date"
          label="Data scadenza"
          type="date"
          required
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
        />

        <Button type="submit" variant="primary" loading={submitting}>
          Assegna e modifica
        </Button>
      </form>
      )}
    </div>
  );
}
