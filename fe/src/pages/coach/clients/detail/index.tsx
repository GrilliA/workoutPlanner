import { useState, type FormEvent } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ApiError,
  resetCoachClientPassword,
  revokeCoachAssignment,
  unlinkCoachClient,
  updateCoachAssignment,
  useMutation,
  type CoachAssignment,
} from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { toast } from "@components/toast";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../../coachCard";
import { ClientAnalyticsSection } from "./analytics/clientanalytics";
import { useClientDetail } from "./api/useClientDetail";
import "../../style.css";

const statusLabel: Record<CoachAssignment["status"], string> = {
  scheduled: "Programmata",
  active: "Attiva",
  expired: "Scaduta",
  revoked: "Revocata",
};

type AssignmentDraft = {
  startsAt: string;
  expiresAt: string;
};

const toDraft = (assignment: CoachAssignment): AssignmentDraft => ({
  startsAt: assignment.startsAt,
  expiresAt: assignment.expiresAt,
});

const formatSessionDate = (value: string) =>
  new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const athleteId = Number(params?.id);
  const idValid = Number.isInteger(athleteId) && athleteId >= 1;

  if (!idValid) {
    return (
      <div className="coach-page page-container page-container--wide">
        <PageHeader title="Cliente" />
        <p className="coach-empty">Cliente non trovato</p>
      </div>
    );
  }

  return <ClientDetailLoaded key={athleteId} athleteId={athleteId} />;
}

function ClientDetailLoaded({ athleteId }: { athleteId: number }) {
  const [, setLocation] = useLocation();
  const { detail, setDetail, loading } = useClientDetail(athleteId);
  const [drafts, setDrafts] = useState<Record<number, AssignmentDraft>>({});
  const [password, setPassword] = useState("");

  const client = detail?.client ?? null;
  const assignments = detail?.assignments ?? [];
  const recentSessions = detail?.recentSessions ?? [];

  const replaceAssignment = (updated: CoachAssignment) => {
    setDetail((existing) => {
      if (!existing) {
        return existing;
      }

      return {
        ...existing,
        assignments: existing.assignments.map((row) =>
          row.id === updated.id ? updated : row,
        ),
      };
    });
    setDrafts((existing) => ({ ...existing, [updated.id]: toDraft(updated) }));
  };

  const resetPassword = useMutation({
    mutationFn: (nextPassword: string) =>
      resetCoachClientPassword(athleteId, { password: nextPassword }),
    fallback: "Reset password fallito",
    onSuccess: () => {
      setPassword("");
      toast.success("Password aggiornata");
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Reset password fallito"));
    },
  });

  const saveDates = useMutation({
    mutationFn: (assignment: CoachAssignment) => {
      const draft = drafts[assignment.id] ?? toDraft(assignment);
      return updateCoachAssignment(assignment.id, {
        startsAt: draft.startsAt !== assignment.startsAt ? draft.startsAt : undefined,
        expiresAt:
          draft.expiresAt !== assignment.expiresAt ? draft.expiresAt : undefined,
      });
    },
    fallback: "Salvataggio date fallito",
    onSuccess: (updated) => {
      replaceAssignment(updated);
      toast.success("Date aggiornate");
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Salvataggio date fallito"));
    },
  });

  const revoke = useMutation({
    mutationFn: revokeCoachAssignment,
    fallback: "Revoca fallita",
    onSuccess: (updated) => {
      replaceAssignment(updated);
      toast.success("Scheda revocata");
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Revoca fallita"));
    },
  });

  const unlink = useMutation<void, Awaited<ReturnType<typeof unlinkCoachClient>>>({
    mutationFn: () => unlinkCoachClient(athleteId),
    fallback: "Scollegamento fallito",
    onSuccess: () => {
      toast.success("Cliente scollegato");
      setLocation("/clients");
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Scollegamento fallito"));
    },
  });

  const handleResetPassword = (event: FormEvent) => {
    event.preventDefault();
    resetPassword.mutate(password);
  };

  const handleUnlink = () => {
    const confirmed = window.confirm(
      "Scollegare questo cliente? Le schede assegnate verranno revocate. L'account atleta resterà attivo.",
    );

    if (!confirmed) {
      return;
    }

    unlink.mutate();
  };

  const updateDraft = (assignment: CoachAssignment, patch: Partial<AssignmentDraft>) => {
    setDrafts((existing) => ({
      ...existing,
      [assignment.id]: {
        ...toDraft(assignment),
        ...existing[assignment.id],
        ...patch,
      },
    }));
  };

  return (
    <div className="coach-page page-container page-container--wide">
      <PageHeader
        title={client?.name ?? client?.email ?? "Cliente"}
        subtitle={client?.email}
        action={
          <Link
            href={`/assignments/new?athleteId=${athleteId}`}
            className="coach-btn-link coach-btn-link--primary"
          >
            Assegna scheda
          </Link>
        }
      />

      {loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!loading && !client ? (
        <p className="coach-empty">Cliente non trovato</p>
      ) : null}

      {!loading && client ? (
        <>
          <ClientAnalyticsSection athleteId={athleteId} />

          <section className="coach-section">
            <h2>Storico allenamenti</h2>
            {recentSessions.length === 0 ? (
              <p className="coach-empty">Nessuna sessione completata</p>
            ) : (
              <CoachCardList>
                {recentSessions.map((session) => (
                  <CoachCard
                    key={session.sessionId}
                    title={session.workoutName}
                    subtitle={`${formatSessionDate(session.completedAt)} · ${session.durationMin} min · ${Math.round(session.volumeKg)} kg`}
                  />
                ))}
              </CoachCardList>
            )}
          </section>

          <section className="coach-section">
            <h2>Password</h2>
            <form className="coach-form" onSubmit={(event) => void handleResetPassword(event)}>
              <Input
                id="client-detail-reset-password"
                label="Nuova password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="minimo 8 caratteri"
              />

              <Button
                type="submit"
                variant="secondary"
                loading={resetPassword.isPending}
              >
                Reimposta password
              </Button>
            </form>
          </section>

          <section className="coach-section">
            <h2>Schede</h2>
            {assignments.length === 0 ? (
              <p className="coach-empty">Nessuna scheda assegnata</p>
            ) : (
              <CoachCardList>
                {assignments.map((assignment) => {
                  const draft = drafts[assignment.id] ?? toDraft(assignment);
                  const canEditDates = assignment.status !== "revoked";
                  const canRevoke =
                    assignment.status === "active" || assignment.status === "scheduled";
                  const datesChanged =
                    draft.startsAt !== assignment.startsAt ||
                    draft.expiresAt !== assignment.expiresAt;
                  const programHref = `/clients/${athleteId}/programs/${assignment.workoutId}`;

                  return (
                    <CoachCard key={assignment.id}>
                      <h2>
                        <Link href={programHref} className="coach-card__title-link">
                          {assignment.workoutName ?? `Scheda #${assignment.workoutId}`}
                        </Link>
                      </h2>
                      <p style={{ marginBottom: "0.75rem" }}>
                        <span className={`coach-status ${assignment.status}`}>
                          {statusLabel[assignment.status]}
                        </span>
                      </p>

                      {canEditDates ? (
                        <div className="coach-card-dates">
                          <Input
                            id={`client-detail-assignment-${assignment.id}-start`}
                            label="Inizio"
                            type="date"
                            value={draft.startsAt}
                            onChange={(event) =>
                              updateDraft(assignment, { startsAt: event.target.value })
                            }
                          />
                          <Input
                            id={`client-detail-assignment-${assignment.id}-end`}
                            label="Fine"
                            type="date"
                            value={draft.expiresAt}
                            onChange={(event) =>
                              updateDraft(assignment, { expiresAt: event.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <p>
                          {assignment.startsAt} → {assignment.expiresAt}
                        </p>
                      )}

                      <div className="coach-card-actions">
                        <Link href={programHref} className="coach-link">
                          Vedi scheda
                        </Link>
                        {assignment.status !== "revoked" ? (
                          <Link href={`${programHref}/edit`} className="coach-link">
                            Modifica scheda
                          </Link>
                        ) : null}
                        {canEditDates && datesChanged ? (
                          <button
                            type="button"
                            className="coach-text-action"
                            onClick={() => saveDates.mutate(assignment)}
                            disabled={
                              saveDates.isPending &&
                              saveDates.variables?.id === assignment.id
                            }
                          >
                            {saveDates.isPending &&
                            saveDates.variables?.id === assignment.id
                              ? "Salvataggio…"
                              : "Salva date"}
                          </button>
                        ) : null}
                        {canRevoke ? (
                          <button
                            type="button"
                            className="coach-text-action coach-text-action--danger"
                            onClick={() => revoke.mutate(assignment.id)}
                            disabled={
                              revoke.isPending && revoke.variables === assignment.id
                            }
                          >
                            {revoke.isPending && revoke.variables === assignment.id
                              ? "Revoca…"
                              : "Revoca"}
                          </button>
                        ) : null}
                      </div>
                    </CoachCard>
                  );
                })}
              </CoachCardList>
            )}
          </section>

          <section className="coach-section coach-section--spaced">
            <h2>Scollega cliente</h2>
            <p className="coach-empty" style={{ marginBottom: "0.75rem" }}>
              Rimuove il collegamento coach-atleta e revoca le schede assegnate. L&apos;account
              atleta non viene eliminato.
            </p>
            <Button
              variant="secondary"
              loading={unlink.isPending}
              onClick={handleUnlink}
            >
              Scollega cliente
            </Button>
          </section>
        </>
      ) : null}
    </div>
  );
}
