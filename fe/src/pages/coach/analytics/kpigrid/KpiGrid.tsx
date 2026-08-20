import type { AnalyticsKpi } from "../types";
import "./style.css";

type KpiGridProps = {
  items: AnalyticsKpi[];
};

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="analytics-kpi-grid">
      {items.map((item) => (
        <div
          key={item.id}
          className={[
            "analytics-kpi",
            item.tone === "warning" ? "analytics-kpi--warning" : null,
            item.tone === "danger" ? "analytics-kpi--danger" : null,
            item.tone === "accent" ? "analytics-kpi--accent" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="label">{item.label}</span>
          <span className="value-row">
            <span className="value">{item.value}</span>
            {item.hint ? <span className="hint">{item.hint}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
