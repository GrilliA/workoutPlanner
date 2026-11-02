import { StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import type { ProgressTile } from "../types";

type KpiGridProps = {
  items: ProgressTile[];
};

/** Tile bianche sotto la card indaco (record, serie). */
export function KpiGrid({ items }: KpiGridProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Record e serie">
      {items.map((item) => (
        <View key={item.id} style={styles.tile}>
          <Meta>{item.label}</Meta>
          <AppText tone="heading" style={styles.value}>
            {item.value}
          </AppText>
          <Meta>{item.note}</Meta>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 2,
    ...shadows.card,
  },
  value: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
});
