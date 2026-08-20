import { StyleSheet, View } from "react-native";
import { AppText, Meta, SectionLabel } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { VolumeCardModel } from "../types";

type VolumeCardProps = {
  model: VolumeCardModel;
};

export function VolumeCard({ model }: VolumeCardProps) {
  return (
    <View style={styles.card} accessibilityLabel="Carico registrato">
      <SectionLabel>{model.title}</SectionLabel>
      <View style={styles.valueRow}>
        <AppText tone="heading" style={styles.value}>
          {model.value}
        </AppText>
        <Meta style={styles.unit}>{model.unit}</Meta>
      </View>
      <Meta>{model.trend}</Meta>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
  },
  unit: {
    fontSize: 12,
    fontWeight: "700",
  },
});
