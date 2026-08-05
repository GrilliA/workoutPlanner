import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ApiError, getCoachTemplates, type CoachTemplate } from "@api";
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
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
          title="Template"
          subtitle="Schede modello da riusare sui clienti"
          action={
            <Link href="/templates/new" className="coach-btn-link coach-btn-link--primary">
              Nuovo template
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

            {!error && templates.length === 0 ? (
              <p className="coach-empty">Nessun template. Creane uno da usare come base.</p>
            ) : null}

            {templates.length > 0 ? (
              <div className="coach-card-list">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    href={`/templates/${template.id}/edit`}
                    className="coach-card coach-card--nav"
                  >
                    <span className="coach-card__body">
                      <h2>{template.name}</h2>
                      <p>
                        {template.frequency} · {template.exerciseCount} esercizi
                      </p>
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
