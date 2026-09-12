import { Link } from "wouter";
import type { DashboardActivityItem } from "../types";
import "./style.css";

type ActivityFeedProps = {
  items: DashboardActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="activity-feed" aria-labelledby="activity-feed-title">
      <h2 id="activity-feed-title">Attività recente</h2>
      {items.length === 0 ? (
        <p className="coach-empty">Nessuna sessione recente</p>
      ) : (
        <div className="activity-feed__list">
          {items.map((item) => (
            <Link
              key={item.sessionId}
              href={`/clients/${item.athleteId}`}
              className="activity-feed__row"
            >
              <span className="activity-feed__athlete">{item.athleteLabel}</span>
              <span className="activity-feed__detail">
                {item.workoutName} · {item.completedAtLabel}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
