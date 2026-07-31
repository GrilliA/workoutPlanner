import type { EChartsOption } from "echarts";
import type { DashboardMonthPoint } from "../types";

const ACCENT = "#c7f464";
const TEXT = "#aaaaaa";
const TEXT_H = "#e0e0e0";
const BORDER = "rgba(224, 224, 224, 0.12)";

export function buildOption(points: DashboardMonthPoint[]): EChartsOption {
  return {
    animationDuration: 280,
    grid: {
      left: 36,
      right: 12,
      top: 28,
      bottom: 36,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#252830",
      borderColor: BORDER,
      textStyle: { color: TEXT_H },
      valueFormatter: (value) => `${value ?? 0} scadenze`,
    },
    xAxis: {
      type: "category",
      data: points.map((point) => point.monthLabel),
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
      axisLabel: { color: TEXT, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: BORDER, type: "dashed" } },
      axisLabel: { color: TEXT, fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        name: "Scadenze",
        data: points.map((point) => point.count),
        barMaxWidth: 36,
        itemStyle: {
          color: ACCENT,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}
