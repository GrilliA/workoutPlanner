import type { LostSummary } from "../types";
import "./style.css";

type LostCardProps = {
  summary: LostSummary;
};

export function LostCard({ summary }: LostCardProps) {
  return (
    <section className="business-lost" aria-labelledby="business-lost-title">
      <h2 id="business-lost-title">Clienti persi</h2>
      <p className="total">{summary.total}</p>
      <dl className="months">
        {summary.months.map((month) => (
          <div key={month.label} className="month">
            <dt>{month.label}</dt>
            <dd>{month.count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
