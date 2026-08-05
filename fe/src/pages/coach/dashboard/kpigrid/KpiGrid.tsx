import { Link } from "wouter";
import type { DashboardKpi } from "../types";
import "./style.css";

type KpiGridProps = {
  items: DashboardKpi[];
};

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="coach-kpi-grid">
      {items.map((item) => {
        const className = [
          "coach-kpi",
          "coach-kpi--link",
          item.tone === "warning" ? "coach-kpi--warning" : null,
          item.tone === "danger" ? "coach-kpi--danger" : null,
          item.tone === "accent" ? "coach-kpi--accent" : null,
        ]
          .filter(Boolean)
          .join(" ");

        const body = (
          <>
            <span className="label">{item.label}</span>
            <span className="value-row">
              <span className="value">{item.value}</span>
              {item.hint ? <span className="hint">{item.hint}</span> : null}
            </span>
          </>
        );

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className={className}>
              {body}
            </Link>
          );
        }

        return (
          <div key={item.id} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
