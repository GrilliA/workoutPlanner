import { Skeleton } from "@components/skeleton";
import "./style.css";

const KPI_PLACEHOLDERS = ["sessions", "active", "alerts", "volume"];
const ALERT_PLACEHOLDERS = ["one", "two", "three"];

export function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton" aria-hidden="true">
      <div className="analytics-skeleton__kpis">
        {KPI_PLACEHOLDERS.map((id) => (
          <div key={id} className="analytics-skeleton__kpi">
            <Skeleton variant="text" width="42%" />
            <Skeleton height="1.65rem" width="3.25rem" />
          </div>
        ))}
      </div>

      <div className="analytics-skeleton__chart">
        <Skeleton variant="text" width="7rem" />
        <Skeleton height={120} />
        <Skeleton variant="text" width="55%" />
      </div>

      <div className="analytics-skeleton__alerts">
        <Skeleton variant="text" width="8rem" />
        <div className="analytics-skeleton__rows">
          {ALERT_PLACEHOLDERS.map((id) => (
            <Skeleton key={id} height="3.2rem" />
          ))}
        </div>
      </div>
    </div>
  );
}
