import { Skeleton } from "@components/skeleton";
import "./style.css";

const KPI_PLACEHOLDERS = ["sessions", "pr", "volume", "last"];
const ROW_PLACEHOLDERS = ["one", "two", "three"];

export function ClientAnalyticsSkeleton() {
  return (
    <div className="client-analytics-skeleton" aria-hidden="true">
      <Skeleton className="client-analytics-skeleton__insight" height="3.2rem" />

      <div className="client-analytics__kpis">
        {KPI_PLACEHOLDERS.map((id) => (
          <div key={id} className="client-analytics__kpi">
            <Skeleton variant="text" width="40%" />
            <Skeleton height="1.35rem" width="3rem" />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>

      <div className="client-analytics-skeleton__chart">
        <Skeleton variant="text" width="7rem" />
        <Skeleton height={120} />
        <Skeleton variant="text" width="60%" />
      </div>

      <div className="client-analytics__progressions">
        <Skeleton variant="text" width="9rem" />
        <ul>
          {ROW_PLACEHOLDERS.map((id) => (
            <li key={id}>
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="text" width="70%" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
