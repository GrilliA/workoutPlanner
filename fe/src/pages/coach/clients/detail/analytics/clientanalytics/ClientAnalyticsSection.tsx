import { PeriodFilter } from "../../../../analytics/periodfilter";
import { WeeklyChart } from "../../../../analytics/weeklychart";
import { useClientAnalytics } from "../useClientAnalytics";
import "./style.css";

type ClientAnalyticsSectionProps = {
  athleteId: number;
};

export function ClientAnalyticsSection({ athleteId }: ClientAnalyticsSectionProps) {
  const { range, setRange, ...state } = useClientAnalytics(athleteId, "4w");

  return (
    <section className="client-analytics coach-section">
      <div className="client-analytics__header">
        <h2>Analisi atleta</h2>
        {state.status === "ready" ? (
          <p className="client-analytics__period">{state.data.periodLabel}</p>
        ) : null}
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {state.status === "loading" ? (
        <p className="coach-empty">Caricamento analisi…</p>
      ) : null}

      {state.status === "error" ? (
        <p className="coach-empty" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <p className="client-analytics__insight">{state.data.insight}</p>

          <div className="client-analytics__kpis">
            {state.data.kpis.map((kpi) => (
              <div key={kpi.id} className="client-analytics__kpi">
                <span className="label">{kpi.label}</span>
                <span className="value">{kpi.value}</span>
                <span className="hint">{kpi.hint}</span>
              </div>
            ))}
          </div>

          <WeeklyChart model={state.data.weeklyChart} />

          {state.data.exercises.length > 0 ? (
            <div className="client-analytics__progressions">
              <h3>Progressioni esercizi</h3>
              <ul>
                {state.data.exercises.map((exercise) => (
                  <li key={exercise.exerciseId}>
                    <strong>{exercise.name}</strong>
                    <span>
                      {exercise.prLabel} · {exercise.trendLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : state.data.hasData ? (
            <p className="coach-empty">Nessuna progressione esercizio nel periodo.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
