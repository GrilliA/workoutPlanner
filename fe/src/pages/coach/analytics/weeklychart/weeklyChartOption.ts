import type { EChartsCoreOption } from "echarts/core";
import type { WeeklyChartModel } from "../types";
import { formatInteger, formatKg } from "../mappers/formatters";

export type WeeklyChartTheme = {
  accent: string;
  text: string;
  textH: string;
  surface: string;
  border: string;
  bg: string;
};

export const weeklyChartOption = (
  model: WeeklyChartModel,
  theme: WeeklyChartTheme,
): EChartsCoreOption => ({
  backgroundColor: theme.surface,
  grid: {
    left: 4,
    right: 4,
    top: 12,
    bottom: 0,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: theme.bg,
    borderColor: theme.border,
    textStyle: {
      color: theme.textH,
    },
    axisPointer: {
      type: "line",
      lineStyle: {
        color: theme.accent,
      },
    },
    formatter: (params: { dataIndex?: number } | { dataIndex?: number }[]) => {
      const item = Array.isArray(params) ? params[0] : params;
      const week = model.bars[item?.dataIndex ?? -1];
      if (!week) {
        return "";
      }

      return [
        week.label,
        `${formatInteger(week.sessionValue)} sessioni`,
        `Carico: ${formatKg(week.volumeValue)}`,
      ].join("<br/>");
    },
  },
  xAxis: {
    type: "category",
    data: model.bars.map((bar) => bar.label),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      interval: "auto",
      hideOverlap: true,
      color: theme.text,
      showMinLabel: true,
      showMaxLabel: true,
    },
  },
  yAxis: {
    type: "value",
    min: 0,
    minInterval: 1,
    axisTick: { show: false },
    axisLine: { show: false },
    splitLine: {
      lineStyle: {
        color: theme.border,
      },
    },
    axisLabel: {
      color: theme.text,
    },
  },
  series: [
    {
      type: "line",
      data: model.bars.map((week) => week.sessionValue),
      showSymbol: model.bars.length <= 12,
      symbol: "circle",
      symbolSize: 7,
      lineStyle: {
        color: theme.accent,
        width: 2,
      },
      itemStyle: {
        color: theme.accent,
      },
    },
  ],
});
