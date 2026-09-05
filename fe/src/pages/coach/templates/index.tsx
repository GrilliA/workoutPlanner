import { Link } from "wouter";
import { PageError } from "@components/pageError";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../coachCard";
import { useTemplates } from "./api/useTemplates";
import "../style.css";

export default function TemplatesPage() {
  const { templates, loading, error, retry } = useTemplates();

  return (
    <div className="coach-page page-container page-container--wide">
      <PageHeader
        title="Template"
        subtitle="Schede modello da riusare sui clienti"
        action={
          <Link href="/templates/new" className="coach-btn-link coach-btn-link--primary">
            Nuovo template
          </Link>
        }
      />

      {error ? <PageError message={error} onRetry={retry} /> : null}

      {!error && loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!error && !loading && templates.length === 0 ? (
        <p className="coach-empty">Nessun template. Creane uno da usare come base.</p>
      ) : null}

      {!error && !loading && templates.length > 0 ? (
        <CoachCardList>
          {templates.map((template) => (
            <CoachCard
              key={template.id}
              href={`/templates/${template.id}/edit`}
              title={template.name}
              subtitle={`${template.frequency} · ${template.exerciseCount} esercizi`}
            />
          ))}
        </CoachCardList>
      ) : null}
    </div>
  );
}
