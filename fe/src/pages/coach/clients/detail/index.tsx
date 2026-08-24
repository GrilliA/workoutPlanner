import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ApiError,
  getCoachClient,
  resetCoachClientPassword,
  revokeCoachAssignment,
  unlinkCoachClient,
  updateCoachAssignment,
  type CoachAssignment,
  type CoachClient,
  type CoachClientDetail,
} from "@api";
import { AppShell } from "@components/appshell";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { CoachPageHeader } from "../../coachpageheader";
import { ClientAnalyticsSection } from "./analytics/clientanalytics";
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
          <CoachPageHeader title="Cliente" />
          <p className="coach-empty" role="alert">
            Cliente non trovato
          </p>
        </div>
      </AppShell>
    );
  }

  return <ClientDetailLoaded key={athleteId} athleteId={athleteId} />;
}

function ClientDetailLoaded({ athleteId }: { athleteId: number }) {
  const [, setLocation] = useLocation();
  const [client, setClient] = useState<CoachClient | null>(null);
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [recentSessions, setRecentSessions] = useState<
    CoachClientDetail["recentSessions"]
  >([]);
  const [drafts, setDrafts] = useState<Record<number, AssignmentDraft>>({});
  const [password, setPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState<number | null>(null);
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<number | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachClient(athleteId)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setClient(data.client);
        setAssignments(data.assignments);
        setRecentSessions(data.recentSessions);
        setDrafts(
          Object.fromEntries(
            data.assignments.map((assignment) => [assignment.id, toDraft(assignment)]),
          ),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setResettingPassword(true);
    setError(null);
    setPasswordSuccess(null);

    try {
      await resetCoachClientPassword(athleteId, { password });
      setPassword("");
      setPasswordSuccess("Password aggiornata");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset password fallito");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveAssignment = async (assignment: CoachAssignment) => {
    const draft = drafts[assignment.id];
    if (!draft) {
      return;
    }

    setSavingAssignmentId(assignment.id);
    setError(null);

    try {
      const updated = await updateCoachAssignment(assignment.id, {
        startsAt: draft.startsAt !== assignment.startsAt ? draft.startsAt : undefined,
        expiresAt: draft.expiresAt !== assignment.expiresAt ? draft.expiresAt : undefined,
      });
      setAssignments((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setDrafts((current) => ({ ...current, [updated.id]: toDraft(updated) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio date fallito");
    } finally {
      setSavingAssignmentId(null);
    }
  };

  const handleRevoke = async (assignmentId: number) => {
    setRevokingAssignmentId(assignmentId);
    setError(null);

    try {
      const updated = await revokeCoachAssignment(assignmentId);
      setAssignments((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setDrafts((current) => ({ ...current, [updated.id]: toDraft(updated) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Revoca fallita");
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
    setError(null);

    try {
      await unlinkCoachClient(athleteId);
      setLocation("/clients");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Scollegamento fallito");
    } finally {
      setUnlinking(false);
    }
  };

  const updateDraft = (assignmentId: number, patch: Partial<AssignmentDraft>) => {
    setDrafts((current) => ({
      ...current,
      [assignmentId]: { ...current[assignmentId], ...patch },
    }));
  };

  return (
    <AppShell>
      <div className="coach-page page-container page-container--wide">
        <CoachPageHeader
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
        ) : !client ? (
          <p className="coach-empty" role="alert">
            {error ?? "Cliente non trovato"}
          </p>
        ) : (
          <>
            {error ? (
              <p className="coach-empty" role="alert">
                {error}
              </p>
            ) : null}

            <ClientAnalyticsSection athleteId={athleteId} />

            <section className="coach-section">
              <h2>Storico allenamenti</h2>
              {recentSessions.length === 0 ? (
                <p className="coach-empty">Nessuna sessione completata</p>
              ) : (
                <div className="coach-card-list">
                  {recentSessions.map((session) => (
                    <div key={session.sessionId} className="coach-card">
                      <h2>{session.workoutName}</h2>
                      <p>
                        {formatSessionDate(session.completedAt)} · {session.durationMin} min ·{" "}
                        {Math.round(session.volumeKg)} kg
                      </p>
                    </div>
                  ))}
                </div>
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

                {passwordSuccess ? <p className="coach-empty">{passwordSuccess}</p> : null}

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
                <div className="coach-card-list">
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
                      <div key={assignment.id} className="coach-card">
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
                                  updateDraft(assignment.id, { startsAt: event.target.value })
                                }
                              />
                            </Input.Root>
                            <Input.Root>
                              <Input.Label>Fine</Input.Label>
                              <Input.Field
                                type="date"
                                value={draft.expiresAt}
                                onChange={(event) =>
                                  updateDraft(assignment.id, { expiresAt: event.target.value })
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
                      </div>
                    );
                  })}
                </div>
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
        )}
      </div>
    </AppShell>
  );
}
