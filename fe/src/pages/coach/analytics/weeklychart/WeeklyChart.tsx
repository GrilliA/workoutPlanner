import { useEffect, useRef } from "react";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { WeeklyChartModel } from "../types";
import { weeklyChartOption, type WeeklyChartTheme } from "./weeklyChartOption";
import "./style.css";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type WeeklyChartProps = {
  model: WeeklyChartModel;
};

const themeFromHost = (host: HTMLElement): WeeklyChartTheme => {
  const styles = getComputedStyle(host);

  return {
    accent: styles.getPropertyValue("--accent").trim(),
    text: styles.getPropertyValue("--text").trim(),
    textH: styles.getPropertyValue("--text-h").trim(),
    surface: styles.getPropertyValue("--surface").trim(),
    border: styles.getPropertyValue("--border").trim(),
    bg: styles.getPropertyValue("--bg").trim(),
  };
};

export function WeeklyChart({ model }: WeeklyChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const plot = plotRef.current;
    if (!host || !plot || model.bars.length === 0) {
      return;
    }

    const chart = echarts.init(plot, undefined, { renderer: "canvas" });
    chart.setOption(weeklyChartOption(model, themeFromHost(host)));

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(plot);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [model]);

  if (model.bars.length === 0) {
    return (
      <section className="analytics-chart" aria-label="Trend settimanale portafoglio">
        <h2>Trend settimanale</h2>
        <p className="analytics-chart__empty">
          Dati insufficienti per mostrare il trend nel periodo selezionato.
        </p>
      </section>
    );
  }

  return (
    <section
      ref={hostRef}
      className="analytics-chart"
      aria-label="Trend settimanale portafoglio"
    >
      <h2>Trend settimanale</h2>
      <div ref={plotRef} className="analytics-chart__plot" aria-hidden="true" />
      <p className="analytics-chart__summary">{model.summary}</p>
      {model.hasVolume ? (
        <p className="analytics-chart__volume">{model.volumeSummary}</p>
      ) : null}
    </section>
  );
}
