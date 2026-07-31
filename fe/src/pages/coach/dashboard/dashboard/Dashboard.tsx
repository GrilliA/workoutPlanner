import { Link } from "wouter";
import { CoachPageHeader } from "../../coachpageheader";
import { ExpirationChart } from "../expirationchart";
import { ExpirationList } from "../expirationlist";
import { KpiGrid } from "../kpigrid";
import { useDashboard } from "../useDashboard";
import "../../style.css";
import "./style.css";

export function Dashboard() {
  const state = useDashboard();

  const headerAction = (
    <div className="coach-dashboard__actions">
      <Link href="/clients/new" className="coach-btn-link coach-btn-link--primary">
        Nuovo cliente
      </Link>
      <Link
        href="/assignments/new"
        className="coach-btn-link coach-btn-link--secondary"
      >
        Assegna scheda
      </Link>
    </div>
  );

  return (
    <div className="coach-page page-container page-container--wide">
      <CoachPageHeader
        title="Dashboard coach"
        subtitle="Cosa fare ora: scadenze e rinnovi"
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
          <h2>Inizia dal primo cliente</h2>
          <p className="coach-empty">
            Crea un cliente e assegna una scheda per vedere scadenze e KPI qui.
          </p>
          <div className="coach-dashboard__actions">
            <Link
              href="/clients/new"
              className="coach-btn-link coach-btn-link--primary"
            >
              Nuovo cliente
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
            <ExpirationList
              upcoming={state.data.upcoming}
              expired={state.data.expired}
            />
            <ExpirationChart points={state.data.monthPoints} />
          </div>
        </>
      ) : null}
    </div>
  );
}
