import { PageHeader } from "@components/pageHeader";
import { AlertsTable } from "../alertstable";
import { AnalyticsSkeleton } from "../analyticsskeleton";
import { KpiGrid } from "../kpigrid";
import { PeriodFilter } from "../periodfilter";
import { useCoachAnalytics } from "../api/useCoachAnalytics";
import { WeeklyChart } from "../weeklychart";
import "../../style.css";
import "./style.css";

export function AnalyticsPage() {
  const { data, loading, range, setRange } = useCoachAnalytics("4w");

  return (
    <div className="coach-page page-container page-container--wide analytics-page">
      <PageHeader
        title="Analisi"
        subtitle={
          data
            ? data.periodLabel
            : "Monitoraggio attività e segnali del portafoglio"
        }
      />

      <PeriodFilter value={range} onChange={setRange} />

      {loading ? <AnalyticsSkeleton /> : null}

      {!loading && (!data || data.isEmpty) ? (
        <section className="analytics-page__empty">
          <h2>Nessun cliente collegato</h2>
          <p className="coach-empty">
            Invita il primo atleta per iniziare a monitorare sessioni, attività e segnali
            operativi.
          </p>
        </section>
      ) : null}

      {!loading && data && !data.isEmpty ? (
        <>
          <KpiGrid items={data.kpis} />
          <WeeklyChart model={data.weeklyChart} />
          <AlertsTable rows={data.alertRows} />
        </>
      ) : null}
    </div>
  );
}
