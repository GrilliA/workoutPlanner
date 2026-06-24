import { TopBar } from "./TopBar";
import { WeekStrip } from "./WeekStrip";
import { TodayCard } from "./TodayCard";
import { StatCard } from "./StatCard";
import { WorkoutRow } from "./WorkoutRow";
import { dashboardMock } from "../../pages/home/mock-data";
import "./dashboard.css";
import "./stat-card.css";
import "./workout-row.css";

export function Dashboard() {
  const { userName, todayWorkout, stats, recentWorkouts } = dashboardMock;

  return (
    <div className="dashboard">
      <TopBar userName={userName} />
      <WeekStrip />
      <TodayCard {...todayWorkout} />

      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
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

        <div className="list">
          {recentWorkouts.map((workout) => (
            <WorkoutRow key={workout.id} {...workout} />
          ))}
        </div>
      </section>
    </div>
  );
}
