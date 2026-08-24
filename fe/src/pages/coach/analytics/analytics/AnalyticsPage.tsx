import { CoachPageHeader } from "../../coachpageheader";
import { AlertsTable } from "../alertstable";
import { KpiGrid } from "../kpigrid";
import { PeriodFilter } from "../periodfilter";
import { useCoachAnalytics } from "../useCoachAnalytics";
import { WeeklyChart } from "../weeklychart";
import "../../style.css";
import "./style.css";

export function AnalyticsPage() {
  const { range, setRange, ...state } = useCoachAnalytics("4w");

  return (
    <div className="coach-page page-container page-container--wide analytics-page">
      <CoachPageHeader
        title="Analisi"
        subtitle={
          state.status === "ready"
            ? state.data.periodLabel
            : "Monitoraggio attività e segnali del portafoglio"
        }
      />

      <PeriodFilter value={range} onChange={setRange} />

      {state.status === "loading" ? <p className="coach-empty">Caricamento…</p> : null}

      {state.status === "error" ? (
        <p className="coach-empty" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" && state.data.isEmpty ? (
        <section className="analytics-page__empty">
          <h2>Nessun cliente collegato</h2>
          <p className="coach-empty">
            Invita il primo atleta per iniziare a monitorare sessioni, attività e segnali
            operativi.
          </p>
        </section>
      ) : null}

      {state.status === "ready" && !state.data.isEmpty ? (
        <>
          <KpiGrid items={state.data.kpis} />
          <WeeklyChart model={state.data.weeklyChart} />
          <AlertsTable rows={state.data.alertRows} />
        </>
      ) : null}
    </div>
  );
}
