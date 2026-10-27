import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ApiError,
  createCoachAssignment,
  getCoachClients,
  getCoachTemplates,
  useMutation,
  useQuery,
} from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { toast } from "@components/toast";
import { PageHeader } from "@components/pageHeader";
import { SchedaTxtPaste } from "@pages/coach/programbuilder/schedatxt";
import type { ParsedScheda } from "@pages/coach/programbuilder/schedatxt/parseSchedaTxt";
import { mapDraftToProgramInput } from "@pages/coach/programbuilder/mappers/mapProgramInput";
import { CoachCardListSkeleton } from "../../coachCard";
import "../../style.css";

const parsePresetAthleteId = (search: string): number | null => {
  const id = Number(new URLSearchParams(search).get("athleteId"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export default function NewAssignmentPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const presetAthleteId = parsePresetAthleteId(search);

  const { data, isPending } = useQuery({
    queryFn: ({ signal }) =>
      Promise.all([getCoachClients({ signal }), getCoachTemplates({ signal })]),
    fallback: "Impossibile caricare i dati di assegnazione",
  });
  const clients = data?.[0] ?? [];
  const templates = data?.[1] ?? [];
  const clientOptions = clients.map((client) => ({
    value: String(client.id),
    label: client.name ?? client.email,
  }));
  const templateOptions = [
    { value: "", label: "Da zero" },
    ...templates.map((template) => ({
      value: String(template.id),
      label: template.name,
    })),
  ];
  const [athleteId, setAthleteId] = useState(
    presetAthleteId ? String(presetAthleteId) : "",
  );
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("Nuova scheda");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [parsedTxt, setParsedTxt] = useState<ParsedScheda | null>(null);
  const createAssignment = useMutation({
    mutationFn: createCoachAssignment,
    fallback: "Assegnazione fallita",
    onSuccess: (result, variables) => {
      toast.success("Scheda assegnata");
      setLocation(
        `/clients/${variables.athleteId}/programs/${result.workout.id}/edit`,
      );
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Assegnazione fallita"));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createAssignment.mutate({
      athleteId: Number(athleteId),
      startsAt,
      expiresAt,
      templateId: templateId ? Number(templateId) : undefined,
      name: templateId ? undefined : parsedTxt?.name.trim() || name,
      program:
        !templateId && parsedTxt
          ? mapDraftToProgramInput(parsedTxt.name, parsedTxt.settings, parsedTxt.days)
          : undefined,
    });
  };

  return (
    <div className="coach-page page-container">
      <PageHeader
        title="Assegna scheda"
        subtitle="Da template (copia) oppure da zero sul cliente"
      />

      {isPending ? (
        <CoachCardListSkeleton />
      ) : clients.length === 0 ? (
        <section className="coach-dashboard__empty">
          <h2>Invita il primo cliente</h2>
          <p className="coach-empty">
            Condividi il codice invito: l&apos;atleta si registra sull&apos;app e si collega a te.
          </p>
          <div className="coach-dashboard__actions">
            <Link
              href="/clients/new"
              className="coach-btn-link coach-btn-link--primary"
            >
              Invita cliente
            </Link>
          </div>
        </section>
      ) : (
      <form className="coach-form" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          id="assignment-athlete"
          label="Cliente"
          required
          value={athleteId}
          options={clientOptions}
          onChange={setAthleteId}
        />

        <Select
          id="assignment-template"
          label="Template (opzionale)"
          value={templateId}
          options={templateOptions}
          onChange={(nextTemplateId) => {
            setTemplateId(nextTemplateId);
            setParsedTxt(null);
          }}
        />

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

        <Button type="submit" variant="primary" loading={createAssignment.isPending}>
          Assegna e modifica
        </Button>
      </form>
      )}
    </div>
  );
}
