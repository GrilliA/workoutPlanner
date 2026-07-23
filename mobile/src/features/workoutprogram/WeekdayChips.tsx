import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

/** Monday = 0 … Sunday = 6 (Europe/Rome, same as BE). */
export const WEEKDAY_LABELS_SHORT = [
  "Lun",
  "Mar",
  "Mer",
  "Gio",
  "Ven",
  "Sab",
  "Dom",
] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function toggleWeekday(
  weekdays: number[],
  weekday: WeekdayIndex,
): number[] {
  const has = weekdays.includes(weekday);
  const next = has
    ? weekdays.filter((value) => value !== weekday)
    : [...weekdays, weekday];
  return [...next].sort((a, b) => a - b);
}

type WeekdayChipsProps = {
  selected: number[];
  onChange: (weekdays: number[]) => void;
  disabled?: boolean;
};

/** Selettore giorni della settimana per un giorno di scheda. */
export function WeekdayChips({
  selected,
  onChange,
  disabled = false,
}: WeekdayChipsProps) {
  return (
    <View style={styles.row}>
      {WEEKDAY_LABELS_SHORT.map((label, index) => {
        const weekday = index as WeekdayIndex;
        const isOn = selected.includes(weekday);
        return (
          <Pressable
            key={label}
            disabled={disabled}
            onPress={() => onChange(toggleWeekday(selected, weekday))}
            style={[styles.chip, isOn && styles.chipOn, disabled && styles.dimmed]}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            accessibilityLabel={label}
          >
            <AppText
              style={[styles.chipLabel, isOn && styles.chipLabelOn]}
              tone={isOn ? "heading" : "muted"}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    minWidth: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipLabelOn: {
    color: colors.accent,
  },
  dimmed: {
    opacity: 0.5,
  },
});
