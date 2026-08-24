import { BusyRegion } from "@components/busyregion";
import { CoachPageHeader } from "../../coachpageheader";
import { AlertsTable } from "../alertstable";
import { AnalyticsSkeleton } from "../analyticsskeleton";
import { KpiGrid } from "../kpigrid";
import { PeriodFilter } from "../periodfilter";
import { useCoachAnalytics } from "../useCoachAnalytics";
import { WeeklyChart } from "../weeklychart";
import "../../style.css";
import "./style.css";

export function AnalyticsPage() {
  const { range, setRange, ...state } = useCoachAnalytics("4w");
  const body = state.status === "ready" || state.status === "refreshing" ? state.data : null;

  return (
    <div className="coach-page page-container page-container--wide analytics-page">
      <CoachPageHeader
        title="Analisi"
        subtitle={
          body
            ? body.periodLabel
            : "Monitoraggio attività e segnali del portafoglio"
        }
      />

      <PeriodFilter value={range} onChange={setRange} />

      {state.status === "loading" ? <AnalyticsSkeleton /> : null}

      {state.status === "error" ? (
        <p className="coach-empty" role="alert">
          {state.message}
        </p>
      ) : null}

      {body?.isEmpty ? (
        <BusyRegion busy={state.status === "refreshing"} label="Aggiornamento analisi…">
          <section className="analytics-page__empty">
            <h2>Nessun cliente collegato</h2>
            <p className="coach-empty">
              Invita il primo atleta per iniziare a monitorare sessioni, attività e segnali
              operativi.
            </p>
          </section>
        </BusyRegion>
      ) : null}

      {body && !body.isEmpty ? (
        <BusyRegion busy={state.status === "refreshing"} label="Aggiornamento analisi…">
          <KpiGrid items={body.kpis} />
          <WeeklyChart model={body.weeklyChart} />
          <AlertsTable rows={body.alertRows} />
        </BusyRegion>
      ) : null}
    </div>
  );
}
