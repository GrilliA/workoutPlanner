import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { WeekStripDay } from "../types";

type WeekStripProps = {
  days: WeekStripDay[];
  /** Giorno scelto dall'atleta (YYYY-MM-DD), distinto da "oggi". */
  selectedDateKey?: string | null;
  onDayPress?: (day: WeekStripDay) => void;
};

/**
 * Settimana a chip "Sole": oggi = pill ink, giorni con allenamento =
 * bianco con punto arancio, riposo = solo testo.
 */
export function WeekStrip({
  days,
  selectedDateKey = null,
  onDayPress,
}: WeekStripProps) {
  return (
    <View style={styles.row} accessibilityLabel="Settimana">
      {days.map((day) => {
        // Il riposo non apre un allenamento, ma oggi resta tappabile per tornarci.
        const isInteractive = Boolean(onDayPress) && (day.isToday || !day.isRest);
        const isSelected = selectedDateKey === day.dateKey && !day.isToday;
        const cellStyle = [
          styles.day,
          !day.isRest && styles.dayWorkout,
          isSelected && styles.daySelected,
          day.isToday && styles.dayToday,
        ];
        const labelColor = day.isToday ? colors.onInk : colors.text;
        const numberColor = day.isToday ? colors.onInk : colors.textHeading;

        const content = (
          <>
            <AppText style={[styles.label, { color: labelColor }]}>
              {day.weekdayLabel}
            </AppText>
            <AppText style={[styles.number, { color: numberColor }]}>
              {day.dayNumber}
            </AppText>
            <View style={[styles.dot, !day.isRest && styles.dotOn]} />
          </>
        );

        if (!isInteractive) {
          return (
            <View key={day.dateKey} style={cellStyle}>
              {content}
            </View>
          );
        }

        const workoutLabel = day.workoutDayName ? `: ${day.workoutDayName}` : "";
        return (
          <Pressable
            key={day.dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.weekdayLabel} ${day.dayNumber}${workoutLabel}`}
            onPress={() => onDayPress?.(day)}
            style={({ pressed }) => [cellStyle, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  day: {
    flex: 1,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 2,
  },
  dayWorkout: {
    backgroundColor: colors.surface,
  },
  daySelected: {
    borderColor: colors.accent,
  },
  dayToday: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  number: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.pill,
  },
  dotOn: {
    backgroundColor: colors.accent,
  },
});
