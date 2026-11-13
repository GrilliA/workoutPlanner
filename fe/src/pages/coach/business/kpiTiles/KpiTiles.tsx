import type { BusinessKpi } from "../types";
import "./style.css";

type KpiTilesProps = {
  items: BusinessKpi[];
};

export function KpiTiles({ items }: KpiTilesProps) {
  return (
    <ul className="business-kpis">
      {items.map((item) => (
        <li key={item.id} className="tile">
          <span className="label">{item.label}</span>
          <span className="value">{item.value}</span>
          <span className="hint">{item.hint}</span>
        </li>
      ))}
    </ul>
  );
}
