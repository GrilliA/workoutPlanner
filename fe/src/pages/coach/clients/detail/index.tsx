import { useState, type FormEvent } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ApiError,
  resetCoachClientPassword,
  revokeCoachAssignment,
  unlinkCoachClient,
  updateCoachAssignment,
  type CoachAssignment,
} from "@api";
import { AppShell } from "@components/appShell";
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
      <AppShell>
        <div className="coach-page page-container page-container--wide">
          <PageHeader title="Cliente" />
          <p className="coach-empty">Cliente non trovato</p>
        </div>
      </AppShell>
    );
  }

  return <ClientDetailLoaded key={athleteId} athleteId={athleteId} />;
}

function ClientDetailLoaded({ athleteId }: { athleteId: number }) {
  const [, setLocation] = useLocation();
  const { detail, setDetail, loading } = useClientDetail(athleteId);
  const [drafts, setDrafts] = useState<Record<number, AssignmentDraft>>({});
  const [password, setPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [savingAssignmentId, setSavingAssignmentId] = useState<number | null>(null);
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<number | null>(null);
  const [unlinking, setUnlinking] = useState(false);

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

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setResettingPassword(true);

    try {
      await resetCoachClientPassword(athleteId, { password });
      setPassword("");
      toast.success("Password aggiornata");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Reset password fallito"));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveAssignment = async (assignment: CoachAssignment) => {
    const draft = drafts[assignment.id] ?? toDraft(assignment);

    setSavingAssignmentId(assignment.id);

    try {
      const updated = await updateCoachAssignment(assignment.id, {
        startsAt: draft.startsAt !== assignment.startsAt ? draft.startsAt : undefined,
        expiresAt: draft.expiresAt !== assignment.expiresAt ? draft.expiresAt : undefined,
      });
      replaceAssignment(updated);
      toast.success("Date aggiornate");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Salvataggio date fallito"));
    } finally {
      setSavingAssignmentId(null);
    }
  };

  const handleRevoke = async (assignmentId: number) => {
    setRevokingAssignmentId(assignmentId);

    try {
      const updated = await revokeCoachAssignment(assignmentId);
      replaceAssignment(updated);
      toast.success("Scheda revocata");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Revoca fallita"));
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  const handleUnlink = async () => {
    const confirmed = window.confirm(
      "Scollegare questo cliente? Le schede assegnate verranno revocate. L'account atleta resterà attivo.",
    );

    if (!confirmed) {
      return;
    }

    setUnlinking(true);

    try {
      await unlinkCoachClient(athleteId);
      toast.success("Cliente scollegato");
      setLocation("/clients");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Scollegamento fallito"));
    } finally {
      setUnlinking(false);
    }
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
    <AppShell>
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
                <Input.Root>
                  <Input.Label>Nuova password</Input.Label>
                  <Input.Field
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="minimo 8 caratteri"
                  />
                </Input.Root>

                <Button.Root
                  type="submit"
                  variant="secondary"
                  loading={resettingPassword}
                  disabled={resettingPassword}
                >
                  <Button.Label>Reimposta password</Button.Label>
                </Button.Root>
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
                            <Input.Root>
                              <Input.Label>Inizio</Input.Label>
                              <Input.Field
                                type="date"
                                value={draft.startsAt}
                                onChange={(event) =>
                                  updateDraft(assignment, { startsAt: event.target.value })
                                }
                              />
                            </Input.Root>
                            <Input.Root>
                              <Input.Label>Fine</Input.Label>
                              <Input.Field
                                type="date"
                                value={draft.expiresAt}
                                onChange={(event) =>
                                  updateDraft(assignment, { expiresAt: event.target.value })
                                }
                              />
                            </Input.Root>
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
                              onClick={() => void handleSaveAssignment(assignment)}
                              disabled={savingAssignmentId === assignment.id}
                            >
                              {savingAssignmentId === assignment.id
                                ? "Salvataggio…"
                                : "Salva date"}
                            </button>
                          ) : null}
                          {canRevoke ? (
                            <button
                              type="button"
                              className="coach-text-action coach-text-action--danger"
                              onClick={() => void handleRevoke(assignment.id)}
                              disabled={revokingAssignmentId === assignment.id}
                            >
                              {revokingAssignmentId === assignment.id ? "Revoca…" : "Revoca"}
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
              <Button.Root
                variant="secondary"
                loading={unlinking}
                disabled={unlinking}
                onClick={() => void handleUnlink()}
              >
                <Button.Label>Scollega cliente</Button.Label>
              </Button.Root>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
