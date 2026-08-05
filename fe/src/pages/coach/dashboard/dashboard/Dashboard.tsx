import { Link } from "wouter";
import { CoachPageHeader } from "../../coachpageheader";
import { AthletesTable } from "../athletestable";
import { KpiGrid } from "../kpigrid";
import { LibraryCta } from "../librarycta";
import { TaskPanel } from "../taskpanel";
import { useDashboard } from "../useDashboard";
import "../../style.css";
import "./style.css";

export function Dashboard() {
  const state = useDashboard();

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
      <CoachPageHeader
        title="Dashboard"
        subtitle="Operatività clienti, scadenze e template"
        action={headerAction}
      />

      {state.status === "loading" ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {state.status === "error" ? (
        <p className="coach-empty">{state.message}</p>
      ) : null}

      {state.status === "ready" && state.data.isEmpty ? (
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

      {state.status === "ready" && !state.data.isEmpty ? (
        <>
          <KpiGrid items={state.data.kpis} />
          <div className="coach-dashboard__main">
            <AthletesTable rows={state.data.athletes} />
            <aside className="coach-dashboard__side">
              <TaskPanel tasks={state.data.tasks} />
              <LibraryCta templateCount={state.data.templateCount} />
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
