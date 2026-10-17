import { StyleSheet, View } from "react-native";
import { colors, radii, shadows, spacing } from "../../theme";
import { AppText, Meta } from "../text";

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendAccent?: boolean;
};

/** Tile statistica (griglia 2 colonne) — label sopra, value+unit, trend. */
export function StatCard({
  label,
  value,
  unit,
  trend,
  trendAccent = false,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="meta">{label}</AppText>
      <View style={styles.valueRow}>
        <AppText tone="heading" style={styles.value}>
          {value}
        </AppText>
        {unit ? <Meta>{unit}</Meta> : null}
      </View>
      {trend ? (
        <AppText variant="meta" tone={trendAccent ? "accent" : "default"}>
          {trend}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
});
