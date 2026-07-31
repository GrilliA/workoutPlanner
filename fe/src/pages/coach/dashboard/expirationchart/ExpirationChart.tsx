import { useEffect, useRef } from "react";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { DashboardMonthPoint } from "../types";
import { buildOption } from "./buildOption";
import "./style.css";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

type ExpirationChartProps = {
  points: DashboardMonthPoint[];
};

export function ExpirationChart({ points }: ExpirationChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hasPoints = points.length > 0;

  useEffect(() => {
    if (!hasPoints) {
      return;
    }

    const el = hostRef.current;
    if (!el) {
      return;
    }

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chart.setOption(buildOption(points), true);

    const resize = () => chart.resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      ro.disconnect();
      chart.dispose();
    };
  }, [points, hasPoints]);

  return (
    <section className="expiration-chart">
      <h2>Scadenze per mese</h2>
      {hasPoints ? (
        <div
          ref={hostRef}
          className="expiration-chart__host"
          role="img"
          aria-label="Grafico scadenze per mese"
        />
      ) : (
        <p className="coach-empty">Nessuna scadenza registrata</p>
      )}
    </section>
  );
}
