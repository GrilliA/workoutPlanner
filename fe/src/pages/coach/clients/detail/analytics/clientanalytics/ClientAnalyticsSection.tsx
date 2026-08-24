import { BusyRegion } from "@components/busyregion";
import { PeriodFilter } from "../../../../analytics/periodfilter";
import { WeeklyChart } from "../../../../analytics/weeklychart";
import { useClientAnalytics } from "../useClientAnalytics";
import { ClientAnalyticsSkeleton } from "./ClientAnalyticsSkeleton";
import "./style.css";

type ClientAnalyticsSectionProps = {
  athleteId: number;
};

export function ClientAnalyticsSection({ athleteId }: ClientAnalyticsSectionProps) {
  const { range, setRange, ...state } = useClientAnalytics(athleteId, "4w");
  const body = state.status === "ready" || state.status === "refreshing" ? state.data : null;

  return (
    <section className="client-analytics coach-section">
      <div className="client-analytics__header">
        <h2>Analisi atleta</h2>
        {body ? (
          <p className="client-analytics__period">{body.periodLabel}</p>
        ) : (
          <p className="client-analytics__period" />
        )}
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {state.status === "loading" ? <ClientAnalyticsSkeleton /> : null}

      {state.status === "error" ? (
        <p className="coach-empty" role="alert">
          {state.message}
        </p>
      ) : null}

      {body ? (
        <BusyRegion busy={state.status === "refreshing"} label="Aggiornamento analisi…">
          <p className="client-analytics__insight">{body.insight}</p>

          <div className="client-analytics__kpis">
            {body.kpis.map((kpi) => (
              <div key={kpi.id} className="client-analytics__kpi">
                <span className="label">{kpi.label}</span>
                <span className="value">{kpi.value}</span>
                <span className="hint">{kpi.hint}</span>
              </div>
            ))}
          </div>

          <WeeklyChart model={body.weeklyChart} />

          {body.exercises.length > 0 ? (
            <div className="client-analytics__progressions">
              <h3>Progressioni esercizi</h3>
              <ul>
                {body.exercises.map((exercise) => (
                  <li key={exercise.exerciseId}>
                    <strong>{exercise.name}</strong>
                    <span>
                      {exercise.prLabel} · {exercise.trendLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : body.hasData ? (
            <p className="coach-empty">Nessuna progressione esercizio nel periodo.</p>
          ) : null}
        </BusyRegion>
      ) : null}
    </section>
  );
}
