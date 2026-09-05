import { Link } from "wouter";
import { PageError } from "@components/pageError";
import { PageHeader } from "@components/pageHeader";
import { AthletesTable } from "../athletestable";
import { KpiGrid } from "../kpigrid";
import { LibraryCta } from "../librarycta";
import { TaskPanel } from "../taskpanel";
import { useDashboard } from "../api/useDashboard";
import "../../style.css";
import "./style.css";

export function Dashboard() {
  const { data, loading, error, retry } = useDashboard();

  const headerAction = (
    <div className="coach-dashboard__actions">
      <Link href="/clients/new" className="coach-btn-link coach-btn-link--secondary">
        Invita cliente
      </Link>
      <Link
        href="/templates/new"
        className="coach-btn-link coach-btn-link--primary"
      >
        Nuova scheda
      </Link>
    </div>
  );

  return (
    <div className="coach-page page-container page-container--wide">
      <PageHeader
        title="Dashboard"
        subtitle="Operatività clienti, scadenze e template"
        action={headerAction}
      />

      {error ? <PageError message={error} onRetry={retry} /> : null}

      {!error && loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!error && !loading && (!data || data.isEmpty) ? (
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
            <Link href="/templates/new" className="coach-link">
              Oppure crea un template
            </Link>
          </div>
        </section>
      ) : null}

      {!error && !loading && data && !data.isEmpty ? (
        <>
          <KpiGrid items={data.kpis} />
          <div className="coach-dashboard__main">
            <AthletesTable rows={data.athletes} />
            <aside className="coach-dashboard__side">
              <TaskPanel tasks={data.tasks} />
              <LibraryCta templateCount={data.templateCount} />
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
