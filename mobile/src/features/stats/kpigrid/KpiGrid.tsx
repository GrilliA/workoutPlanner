import { StyleSheet, View } from "react-native";
import { StatCard } from "../../../components";
import { spacing } from "../../../theme";
import type { ProgressKpi } from "../types";

type KpiGridProps = {
  items: ProgressKpi[];
};

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Indicatori principali">
      {items.map((item) => (
        <StatCard
          key={item.id}
          label={item.label}
          value={item.value}
          unit={item.unit}
          trend={item.trend}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
