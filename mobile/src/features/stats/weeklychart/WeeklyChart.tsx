import { ScrollView, StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { Body, Meta, SectionLabel } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { WeeklyChartModel } from "../types";

const CHART_HEIGHT = 120;

type WeeklyChartProps = {
  model: WeeklyChartModel;
};

export function WeeklyChart({ model }: WeeklyChartProps) {
  const slotWidth = model.barWidth + model.barGap;

  const chartContent = (
    <View
      style={[
        styles.chartContent,
        model.scrollable ? { width: model.chartWidth } : styles.chartContentFit,
      ]}
    >
      <Svg
        width={model.chartWidth}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${model.chartWidth} ${CHART_HEIGHT}`}
        accessibilityRole="image"
        accessibilityLabel={model.summary}
      >
        {model.bars.map((bar, index) => {
          const height =
            bar.value === 0
              ? 2
              : Math.max(8, (bar.value / model.maxValue) * (CHART_HEIGHT - 24));
          const x = index * slotWidth;
          const y = CHART_HEIGHT - height - 8;

          return (
            <Rect
              key={`${bar.label}-${index}`}
              x={x}
              y={y}
              width={model.barWidth}
              height={height}
              rx={3}
              fill={bar.value > 0 ? colors.accent : colors.border}
              accessibilityLabel={bar.accessibilityLabel}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width: model.chartWidth }]}>
        {model.bars.map((bar, index) => (
          <View
            key={`${bar.label}-${index}`}
            style={[styles.labelSlot, { width: slotWidth }]}
          >
            {bar.showLabel ? (
              <Meta style={styles.barLabel} numberOfLines={1}>
                {bar.label}
              </Meta>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.card} accessibilityLabel="Grafico costanza settimanale">
      <SectionLabel>COSTANZA SETTIMANALE</SectionLabel>
      {model.bars.length === 0 ? (
        <Body>Dati insufficienti per mostrare il grafico nel periodo selezionato.</Body>
      ) : (
        <>
          {model.scrollable ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityLabel={model.summary}
              contentContainerStyle={styles.scrollContent}
            >
              {chartContent}
            </ScrollView>
          ) : (
            chartContent
          )}
          <Meta accessibilityRole="text">{model.summary}</Meta>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  scrollContent: {
    paddingRight: spacing.sm,
  },
  chartContent: {
    gap: spacing.xs,
  },
  chartContentFit: {
    width: "100%",
  },
  labels: {
    flexDirection: "row",
  },
  labelSlot: {
    alignItems: "center",
    minHeight: 14,
  },
  barLabel: {
    fontSize: 10,
  },
});
