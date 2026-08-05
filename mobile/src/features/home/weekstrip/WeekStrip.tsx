import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { WeekStripDay } from "../types";

type WeekStripProps = {
  days: WeekStripDay[];
  /** Giorno calendario selezionato (YYYY-MM-DD), distinto da “oggi”. */
  selectedDateKey?: string | null;
  onDayPress?: (day: WeekStripDay) => void;
};

/** Strip 7 giorni — stati today / selected / workout / rest. */
export function WeekStrip({
  days,
  selectedDateKey = null,
  onDayPress,
}: WeekStripProps) {
  return (
    <View style={styles.row} accessibilityLabel="Programma settimanale">
      {days.map((day) => {
        const interactive = Boolean(onDayPress) && !day.isRest;
        const isSelected = selectedDateKey === day.dateKey;
        const cellStyle = [
          styles.day,
          day.isToday && !isSelected && styles.dayToday,
          isSelected && styles.daySelected,
          !day.isToday && !isSelected && !day.isRest && styles.dayWorkout,
          !day.isToday && !isSelected && day.isRest && styles.dayRest,
        ];

        const content = (
          <>
            <AppText
              variant="eyebrow"
              tone={isSelected || day.isToday ? "accent" : "muted"}
              style={styles.label}
            >
              {day.weekdayLabel}
            </AppText>
            <AppText tone="heading" style={styles.number}>
              {day.dayNumber}
            </AppText>
            {!day.isRest ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
          </>
        );

        if (!interactive) {
          return (
            <View key={day.dateKey} style={cellStyle}>
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={day.dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.weekdayLabel} ${day.dayNumber}${
              day.workoutDayName ? `: ${day.workoutDayName}` : ""
            }`}
            onPress={() => onDayPress?.(day)}
            style={cellStyle}
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
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dayToday: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accentBorder,
  },
  daySelected: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  dayWorkout: {
    borderColor: "rgba(199, 244, 100, 0.2)",
  },
  dayRest: {
    opacity: 0.5,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  number: {
    fontSize: 14,
    fontWeight: "700",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 2,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
