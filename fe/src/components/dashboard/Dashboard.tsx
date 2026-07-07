import { useDashboard } from "../../pages/home/use-dashboard";
import type { DashboardStat } from "../../pages/home/mock-data";
import { TopBar } from "./TopBar";
import { WeekStrip } from "./WeekStrip";
import { TodayCard } from "./TodayCard";
import { StatCard, EMPTY_STAT_PLACEHOLDERS } from "./StatCard";
import { WorkoutRow } from "./WorkoutRow";
import "./dashboard.css";
import "./stat-card.css";
import "./workout-row.css";

const STAT_SKELETON_COUNT = 4;
const WORKOUT_SKELETON_COUNT = 3;

export function Dashboard() {
  const { status, data, error, retry } = useDashboard();
  const isLoading = status === "loading";
  const isEmpty = status === "empty" || status === "error";
  const userName = data?.userName ?? "Marco";

  const stats: DashboardStat[] = isEmpty || !data?.stats.length
    ? EMPTY_STAT_PLACEHOLDERS
    : data.stats;

  const recentWorkouts = data?.recentWorkouts ?? [];

  return (
    <div className="dashboard">
      <TopBar userName={userName} />
      <WeekStrip />

      {status === "error" && (
        <div className="dashboard-error" role="alert">
          <p>{error ?? "Impossibile caricare la dashboard"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      )}

      <TodayCard workout={data?.todayWorkout ?? null} isLoading={isLoading} />

      <div className="stat-grid" aria-busy={isLoading || undefined}>
        {isLoading
          ? Array.from({ length: STAT_SKELETON_COUNT }, (_, index) => (
              <StatCard.Skeleton key={index} />
            ))
          : stats.map((stat) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                unit={stat.unit}
                trend={stat.trend}
                isEmpty={isEmpty}
              />
            ))}
      </div>

      <section className="recent-workouts" aria-labelledby="recent-workouts-title">
        <div className="header">
          <h2 id="recent-workouts-title" className="title">
            ULTIMI ALLENAMENTI
          </h2>
          <button type="button" className="link">
            Vedi &gt;
          </button>
        </div>

        <div className="list" aria-busy={isLoading || undefined}>
          {isLoading ? (
            Array.from({ length: WORKOUT_SKELETON_COUNT }, (_, index) => (
              <WorkoutRow.Skeleton key={index} />
            ))
          ) : recentWorkouts.length === 0 ? (
            <p className="empty-message" aria-live="polite">
              Nessun allenamento recente
            </p>
          ) : (
            recentWorkouts.map((workout) => (
              <WorkoutRow key={workout.id} {...workout} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
