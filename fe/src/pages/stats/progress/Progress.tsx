import { StatCard, StatCardSkeleton } from "@dashboard/statcard";
import { WorkoutRow, WorkoutRowSkeleton } from "@dashboard/workoutrow";
import { ActivityChart } from "../activitychart";
import { EMPTY_PROGRESS_PLACEHOLDERS } from "../mappers/mapProgress";
import { useProgress } from "../useProgress";
import { VolumeChart } from "../volumechart";
import "./style.css";

const STAT_SKELETON_COUNT = 6;
const SESSION_SKELETON_COUNT = 5;

export function Progress() {
  const { status, data, error, retry } = useProgress();
  const isLoading = status === "loading";
  const showPlaceholders =
    isLoading || status === "error" || status === "empty" || !data?.hasSessionHistory;

  const stats = showPlaceholders
    ? EMPTY_PROGRESS_PLACEHOLDERS
    : (data?.stats ?? EMPTY_PROGRESS_PLACEHOLDERS);

  const dailyBreakdown = data?.dailyBreakdown ?? [];
  const recentSessions = data?.recentSessions ?? [];

  return (
    <div className="progress page-container page-container--wide">
      <header className="header">
        <p className="eyebrow">Analytics</p>
        <h1 className="title">Progressi</h1>
        <p className="subtitle">Ultimi 7 giorni · fuso orario Roma</p>
      </header>

      {status === "error" && (
        <div className="progress-error" role="alert">
          <p>{error ?? "Impossibile caricare i progressi"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      )}

      <div className="stat-grid" aria-busy={isLoading || undefined}>
        {isLoading
          ? Array.from({ length: STAT_SKELETON_COUNT }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))
          : stats.map((stat) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                unit={stat.unit}
                trend={stat.trend}
                isEmpty={showPlaceholders}
              />
            ))}
      </div>

      <section className="chart-section" aria-labelledby="volume-chart-title">
        <h2 id="volume-chart-title" className="section-title">
          Volume settimanale
        </h2>
        {isLoading ? (
          <div className="chart-skeleton" aria-hidden="true" />
        ) : dailyBreakdown.length === 0 ? (
          <p className="empty-message">Nessun dato di volume disponibile</p>
        ) : (
          <VolumeChart points={dailyBreakdown} />
        )}
      </section>

      <section className="chart-section" aria-labelledby="activity-chart-title">
        <h2 id="activity-chart-title" className="section-title">
          Attività
        </h2>
        {isLoading ? (
          <div className="chart-skeleton chart-skeleton--short" aria-hidden="true" />
        ) : dailyBreakdown.length === 0 ? (
          <p className="empty-message">Nessuna attività registrata</p>
        ) : (
          <ActivityChart points={dailyBreakdown} />
        )}
      </section>

      <section className="recent-sessions" aria-labelledby="recent-sessions-title">
        <h2 id="recent-sessions-title" className="section-title">
          Sessioni recenti
        </h2>

        <div className="list" aria-busy={isLoading || undefined}>
          {isLoading ? (
            Array.from({ length: SESSION_SKELETON_COUNT }, (_, index) => (
              <WorkoutRowSkeleton key={index} />
            ))
          ) : recentSessions.length === 0 ? (
            <p className="empty-message" aria-live="polite">
              Completa un allenamento per vedere i progressi
            </p>
          ) : (
            recentSessions.map((session) => (
              <WorkoutRow key={session.id} sessionId={session.id} {...session} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
