import { PageError } from "@components/pageError";
import { PeriodFilter } from "../../../../analytics/periodfilter";
import { WeeklyChart } from "../../../../analytics/weeklychart";
import { useClientAnalytics } from "../api/useClientAnalytics";
import { ClientAnalyticsSkeleton } from "./ClientAnalyticsSkeleton";
import "./style.css";

type ClientAnalyticsSectionProps = {
  athleteId: number;
};

export function ClientAnalyticsSection({ athleteId }: ClientAnalyticsSectionProps) {
  const { range, setRange, data, loading, error, retry } = useClientAnalytics(athleteId, "4w");

  return (
    <section className="client-analytics coach-section">
      <div className="client-analytics__header">
        <h2>Analisi atleta</h2>
        {data ? (
          <p className="client-analytics__period">{data.periodLabel}</p>
        ) : (
          <p className="client-analytics__period" />
        )}
      </div>

      {error ? <PageError message={error} onRetry={retry} /> : null}

      {!error ? <PeriodFilter value={range} onChange={setRange} /> : null}

      {!error && loading ? <ClientAnalyticsSkeleton /> : null}

      {!error && !loading && data ? (
        <>
          <p className="client-analytics__insight">{data.insight}</p>

          <div className="client-analytics__kpis">
            {data.kpis.map((kpi) => (
              <div key={kpi.id} className="client-analytics__kpi">
                <span className="label">{kpi.label}</span>
                <span className="value">{kpi.value}</span>
                <span className="hint">{kpi.hint}</span>
              </div>
            ))}
          </div>

          <WeeklyChart model={data.weeklyChart} />

          {data.exercises.length > 0 ? (
            <div className="client-analytics__progressions">
              <h3>Progressioni esercizi</h3>
              <ul>
                {data.exercises.map((exercise) => (
                  <li key={exercise.exerciseId}>
                    <strong>{exercise.name}</strong>
                    <span>
                      {exercise.prLabel} · {exercise.trendLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : data.hasData ? (
            <p className="coach-empty">Nessuna progressione esercizio nel periodo.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
