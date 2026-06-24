import "./stat-card.css";

type StatCardProps = {
  label: string;
  value: string;
  unit: string;
  trend: string;
};

export function StatCard({ label, value, unit, trend }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className="label">{label}</span>
      <div className="value-row">
        <span className="value">{value}</span>
        <span className="unit">{unit}</span>
      </div>
      <span className="trend">{trend}</span>
    </article>
  );
}
