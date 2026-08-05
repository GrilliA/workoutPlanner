import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ApiError,
  getCoachAssignments,
  revokeCoachAssignment,
  type CoachAssignment,
} from "@api";
import { AppShell } from "@components/appshell";
import { CoachPageHeader } from "../coachpageheader";
import "../style.css";

const statusLabel: Record<CoachAssignment["status"], string> = {
  scheduled: "Programmata",
  active: "Attiva",
  expired: "Scaduta",
  revoked: "Revocata",
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachAssignments()
      .then((data) => {
        if (!cancelled) {
          setAssignments(data);
        }
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
  }, []);

  const handleRevoke = async (id: number) => {
    setRevokingId(id);
    setError(null);

    try {
      await revokeCoachAssignment(id);
      setAssignments(await getCoachAssignments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Revoca fallita");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AppShell>
      <div className="coach-page page-container page-container--wide">
        <CoachPageHeader
          title="Schede assegnate"
          subtitle="Validità e stato delle schede clienti"
          action={
            <Link href="/assignments/new" className="coach-btn-link coach-btn-link--primary">
              Assegna scheda
            </Link>
          }
        />

        {loading ? (
          <p className="coach-empty">Caricamento…</p>
        ) : (
          <>
            {error ? (
              <p className="coach-empty" role="alert">
                {error}
              </p>
            ) : null}

            {!error && assignments.length === 0 ? (
              <p className="coach-empty">Nessuna assegnazione</p>
            ) : null}

            {assignments.length > 0 ? (
              <div className="coach-card-list">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="coach-card">
                    <h2>
                      <Link
                        href={`/clients/${assignment.athleteId}/programs/${assignment.workoutId}`}
                        className="coach-card__title-link"
                      >
                        {assignment.workoutName ?? `Scheda #${assignment.workoutId}`}
                      </Link>
                    </h2>
                    <p>
                      {assignment.athleteName ?? assignment.athleteEmail} ·{" "}
                      {assignment.startsAt} → {assignment.expiresAt}{" "}
                      <span className={`coach-status ${assignment.status}`}>
                        {statusLabel[assignment.status]}
                      </span>
                    </p>
                    <div className="coach-card-actions">
                      <Link href={`/clients/${assignment.athleteId}`} className="coach-link">
                        Cliente
                      </Link>
                      {assignment.status === "active" || assignment.status === "scheduled" ? (
                        <button
                          type="button"
                          className="coach-text-action coach-text-action--danger"
                          onClick={() => void handleRevoke(assignment.id)}
                          disabled={revokingId === assignment.id}
                        >
                          {revokingId === assignment.id ? "Revoca…" : "Revoca"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
