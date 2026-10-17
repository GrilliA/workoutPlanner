import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";
import { WEEKDAY_LABELS_SHORT, type WeekdayIndex } from "./workoutDraft";

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
              tone={isOn ? "heading" : "default"}
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
    minWidth: 48,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  chipOn: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipLabelOn: {
    color: colors.onInk,
  },
  dimmed: {
    opacity: 0.5,
  },
});
