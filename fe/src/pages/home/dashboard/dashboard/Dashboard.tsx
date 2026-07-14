import { Link } from "wouter";
import { useDashboard } from "../useDashboard";
import type { DashboardStat } from "../types";
import { TopBar } from "../topbar";
import { WeekStrip } from "../weekstrip";
import { TodayCard } from "../todaycard";
import { StatCard, StatCardSkeleton, EMPTY_STAT_PLACEHOLDERS } from "../statcard";
import { WorkoutRow, WorkoutRowSkeleton } from "../workoutrow";
import "./style.css";

const STAT_SKELETON_COUNT = 4;
const WORKOUT_SKELETON_COUNT = 3;

export function Dashboard() {
  const { status, data, error, retry } = useDashboard();
  const isLoading = status === "loading";
  const isDashboardUnavailable = status === "empty" || status === "error";
  const showStatPlaceholders =
    isLoading || isDashboardUnavailable || !data?.hasSessionHistory;

  const stats: DashboardStat[] = showStatPlaceholders
    ? EMPTY_STAT_PLACEHOLDERS
    : (data?.stats ?? EMPTY_STAT_PLACEHOLDERS);

  const recentWorkouts = data?.recentWorkouts ?? [];

  return (
    <div className="dashboard page-container page-container--wide">
      <TopBar />
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
              <StatCardSkeleton key={index} />
            ))
          : stats.map((stat) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                unit={stat.unit}
                trend={stat.trend}
                isEmpty={showStatPlaceholders}
              />
            ))}
      </div>

      <section className="recent-workouts" aria-labelledby="recent-workouts-title">
        <div className="header">
          <h2 id="recent-workouts-title" className="title">
            ULTIMI ALLENAMENTI
          </h2>
          <Link href="/stats" className="link">
            Vedi &gt;
          </Link>
        </div>

        <div className="list" aria-busy={isLoading || undefined}>
          {isLoading ? (
            Array.from({ length: WORKOUT_SKELETON_COUNT }, (_, index) => (
              <WorkoutRowSkeleton key={index} />
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
