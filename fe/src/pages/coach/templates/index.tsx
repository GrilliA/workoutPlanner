import { Link } from "wouter";
import { AppShell } from "@components/appShell";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../coachCard";
import { useTemplates } from "./api/useTemplates";
import "../style.css";

export default function TemplatesPage() {
  const { templates, loading } = useTemplates();

  return (
    <AppShell>
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

        {loading ? (
          <p className="coach-empty">Caricamento…</p>
        ) : null}

        {!loading && templates.length === 0 ? (
          <p className="coach-empty">Nessun template. Creane uno da usare come base.</p>
        ) : null}

        {!loading && templates.length > 0 ? (
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
    </AppShell>
  );
}
