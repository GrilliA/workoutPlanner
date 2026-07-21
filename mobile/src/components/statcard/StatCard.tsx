import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText, Meta } from "../text";

type StatCardProps = {
  label: string;
  value: string;
};

/** Tile statistica (griglia 2 colonne). */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <AppText tone="heading" style={styles.value}>
        {value}
      </AppText>
      <Meta>{label}</Meta>
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
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
});
