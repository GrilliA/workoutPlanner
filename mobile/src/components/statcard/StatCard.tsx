import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
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
      <AppText variant="eyebrow" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.valueRow}>
        <AppText tone="heading" style={styles.value}>
          {value}
        </AppText>
        {unit ? (
          <Meta style={styles.unit}>{unit}</Meta>
        ) : null}
      </View>
      {trend ? (
        <AppText
          variant="eyebrow"
          tone={trendAccent ? "accent" : "muted"}
          style={styles.trend}
        >
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
  },
  unit: {
    fontSize: 10,
    fontWeight: "700",
  },
  trend: {
    fontSize: 10,
    marginTop: 2,
  },
});
