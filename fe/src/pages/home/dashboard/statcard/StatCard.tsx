import { Skeleton } from "@components/skeleton";
import "./style.css";

export type StatCardProps = {
  label: string;
  value: string;
  unit: string;
  trend: string;
  isEmpty?: boolean;
};

export function StatCardSkeleton() {
  return (
    <article className="stat-card loading" aria-hidden="true">
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="40%" height={26} />
      <Skeleton variant="text" width="35%" />
    </article>
  );
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  isEmpty = false,
}: StatCardProps) {
  return (
    <article className={`stat-card${isEmpty ? " empty" : ""}`}>
      <span className="label">{label}</span>
      <div className="value-row">
        <span className="value">{value}</span>
        <span className="unit">{unit}</span>
      </div>
      <span className="trend">{trend}</span>
    </article>
  );
}
