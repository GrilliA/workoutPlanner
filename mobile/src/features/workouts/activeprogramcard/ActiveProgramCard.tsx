import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import type { ActiveProgramModel } from "../types";

type ActiveProgramCardProps = {
  program: ActiveProgramModel;
  onOpenMenu: () => void;
};

/** Scheda "In uso": badge, nome, validità e un giorno per riga; azioni nel menu ⋯. */
export function ActiveProgramCard({ program, onOpenMenu }: ActiveProgramCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <AppText style={styles.badgeLabel}>In uso</AppText>
          </View>
          <Meta>{program.sourceLabel}</Meta>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Altre azioni sulla scheda"
          onPress={onOpenMenu}
          hitSlop={8}
          style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
        >
          <AppText tone="heading" style={styles.menuLabel}>
            ⋯
          </AppText>
        </Pressable>
      </View>

      <AppText tone="heading" style={styles.name}>
        {program.name}
      </AppText>
      {program.validityLabel ? <Meta>{program.validityLabel}</Meta> : null}

      <View style={styles.days}>
        {program.days.map((day, index) => (
          <View key={day.id} style={[styles.dayRow, index > 0 && styles.dayRowSeparated]}>
            <AppText tone="heading" style={styles.dayName} numberOfLines={1}>
              {day.name}
            </AppText>
            {day.weekdaysLabel ? <Meta>{day.weekdaysLabel}</Meta> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: colors.accentText,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  menu: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  menuLabel: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "800",
  },
  name: {
    marginTop: spacing.sm,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  days: {
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
  },
  dayRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dayRowSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
});
