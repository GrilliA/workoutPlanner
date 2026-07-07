import { Skeleton } from "@components/skeleton";
import "./style.css";

export type StatCardProps = {
  label: string;
  value: string;
  unit: string;
  trend: string;
  isEmpty?: boolean;
};

type StatCardPlaceholder = StatCardProps & { id: string };

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

export const EMPTY_STAT_PLACEHOLDERS = [
  { id: "volume", label: "Volume", value: "—", unit: "kg", trend: "Nessun dato" },
  { id: "workout", label: "Workout", value: "—", unit: "/sett", trend: "Nessun dato" },
  { id: "streak", label: "Streak", value: "—", unit: "giorni", trend: "Nessun dato" },
  { id: "record", label: "Record", value: "—", unit: "kg", trend: "Nessun dato" },
] satisfies StatCardPlaceholder[];
