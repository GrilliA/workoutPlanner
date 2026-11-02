import { useState } from "react";
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { AppText } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { ProgressHero, WeeklyChartModel } from "../types";

const CHART_HEIGHT = 96;
const MAX_FIT_BAR_WIDTH = 44;

type WeeklyChartProps = {
  hero: ProgressHero;
  model: WeeklyChartModel;
};

const barFill = (isCurrent: boolean): string => {
  if (isCurrent) {
    return colors.accent;
  }
  return colors.dataBg;
};

/**
 * Card indaco di Progressi: numero grande degli allenamenti nel periodo,
 * carico, e una barra per settimana (quella in corso in arancio).
 */
export function WeeklyChart({ hero, model }: WeeklyChartProps) {
  const [fitWidth, setFitWidth] = useState(0);
  // Poche settimane: le barre riempiono la card; tante: larghezza fissa e scroll.
  const isFitted = !model.scrollable && fitWidth > 0 && model.bars.length > 0;
  const chartWidth = isFitted ? fitWidth : model.chartWidth;
  const slotWidth = isFitted
    ? fitWidth / model.bars.length
    : model.barWidth + model.barGap;
  const barWidth = isFitted
    ? Math.min(MAX_FIT_BAR_WIDTH, slotWidth * 0.62)
    : model.barWidth;
  const barOffset = isFitted ? (slotWidth - barWidth) / 2 : 0;
  const chartStyle = model.scrollable ? { width: model.chartWidth } : styles.chartFit;

  const onChartLayout = (event: LayoutChangeEvent) => {
    setFitWidth(event.nativeEvent.layout.width);
  };

  const chartContent = (
    <View
      style={[styles.chartContent, chartStyle]}
      onLayout={model.scrollable ? undefined : onChartLayout}
    >
      <Svg
        width={chartWidth}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        accessibilityRole="image"
        accessibilityLabel={model.summary}
      >
        {/* Linea di base: le settimane a zero restano leggibili. */}
        <Rect
          x={0}
          y={CHART_HEIGHT - 4}
          width={chartWidth}
          height={2}
          rx={1}
          fill={colors.dataBg}
          opacity={0.35}
        />
        {model.bars.map((bar, index) => {
          const height =
            bar.value === 0
              ? 0
              : Math.max(8, (bar.value / model.maxValue) * (CHART_HEIGHT - 12));
          return (
            <Rect
              key={`${bar.label}-${index}`}
              x={index * slotWidth + barOffset}
              y={CHART_HEIGHT - height - 4}
              width={barWidth}
              height={height}
              rx={6}
              fill={barFill(bar.isCurrent)}
              accessibilityLabel={bar.accessibilityLabel}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width: chartWidth }]}>
        {model.bars.map((bar, index) => (
          <View
            key={`${bar.label}-${index}`}
            style={[styles.labelSlot, { width: slotWidth }]}
          >
            {bar.showLabel ? (
              <AppText style={styles.barLabel} numberOfLines={1}>
                {bar.label}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.card} accessibilityLabel="Allenamenti nel periodo">
      <View style={styles.numberRow}>
        <AppText style={styles.number}>{hero.value}</AppText>
        <AppText style={styles.numberLabel}>{hero.label}</AppText>
      </View>
      {hero.volumeLine ? (
        <AppText style={styles.volume}>{hero.volumeLine}</AppText>
      ) : null}

      {model.bars.length > 0 && model.scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={model.summary}
          contentContainerStyle={styles.scrollContent}
        >
          {chartContent}
        </ScrollView>
      ) : null}
      {model.bars.length > 0 && !model.scrollable ? chartContent : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.data,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  numberRow: {
    gap: 2,
  },
  number: {
    color: colors.onData,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: "800",
    letterSpacing: -1,
  },
  numberLabel: {
    color: colors.onData,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  volume: {
    color: colors.dataBg,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  scrollContent: {
    paddingRight: spacing.sm,
  },
  chartContent: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chartFit: {
    width: "100%",
  },
  labels: {
    flexDirection: "row",
  },
  labelSlot: {
    alignItems: "center",
    minHeight: 16,
  },
  barLabel: {
    color: colors.dataBg,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
});
