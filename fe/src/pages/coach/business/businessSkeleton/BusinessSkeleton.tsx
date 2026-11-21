import { Skeleton } from "@components/skeleton";
import "./style.css";

const KPI_PLACEHOLDERS = ["recurring", "expected", "collected"];
const CARD_PLACEHOLDERS = ["renewals", "lost"];

export function BusinessSkeleton() {
  return (
    <div className="business-skeleton" aria-hidden="true">
      <div className="kpis">
        {KPI_PLACEHOLDERS.map((id) => (
          <div key={id} className="card">
            <Skeleton variant="text" width="50%" />
            <Skeleton height="2rem" width="6rem" />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton variant="text" width="9rem" />
        <Skeleton height={140} />
        <Skeleton variant="text" width="55%" />
      </div>
      <div className="cards">
        {CARD_PLACEHOLDERS.map((id) => (
          <div key={id} className="card">
            <Skeleton variant="text" width="6rem" />
            <Skeleton height="2rem" width="5rem" />
            <Skeleton variant="text" width="80%" />
          </div>
        ))}
      </div>
    </div>
  );
}
