import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ApiError, getCoachClients, type CoachClient } from "@api";
import { AppShell } from "@components/appshell";
import { CoachPageHeader } from "../coachpageheader";
import "../style.css";

function CardChevron() {
  return (
    <span className="coach-card__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M9 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function CoachClientsPage() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachClients()
      .then((data) => {
        if (!cancelled) setClients(data);
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

  return (
    <AppShell>
      <div className="coach-page page-container page-container--wide">
        <CoachPageHeader
          title="Clienti"
          subtitle="Atleti collegati al tuo account"
          action={
            <Link href="/clients/new" className="coach-btn-link coach-btn-link--primary">
              Invita cliente
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

            {!error && clients.length === 0 ? (
              <p className="coach-empty">Nessun cliente ancora. Creane uno per iniziare.</p>
            ) : null}

            {clients.length > 0 ? (
              <div className="coach-card-list">
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="coach-card coach-card--nav"
                  >
                    <span className="coach-card__body">
                      <h2>{client.name ?? client.email}</h2>
                      <p>{client.email}</p>
                    </span>
                    <CardChevron />
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
