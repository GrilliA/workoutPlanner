import { Pressable, StyleSheet, View } from "react-native";
import type { AthleteHome } from "../../../api";
import { AppText, Button, Heading, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import { WEEKDAY_LABELS_SHORT } from "../../../utils/romeCalendar";
import { daysUntil, formatLongDate, formatUpcomingStart } from "../mappers/homeLabels";
import { formatExerciseCount } from "../mappers/homeSelection";
import { Chevron } from "./Chevron";

type UpcomingProgram = NonNullable<AthleteHome["upcomingProgram"]>;

type UpcomingProgramCardProps = {
  program: UpcomingProgram;
  todayKey: string;
  /** null = la scheda intera, altrimenti il giorno toccato. */
  onOpen: (workoutDayId: number | null) => void;
};

const coachLabel = (coachName: string | null): string => {
  const firstName = coachName?.trim().split(/\s+/)[0];
  return firstName ? `Nuova da ${firstName}` : "Nuova dal coach";
};

/** Home senza scheda attiva ma con quella del coach in arrivo: cosa parte e quando. */
export function UpcomingProgramCard({ program, todayKey, onOpen }: UpcomingProgramCardProps) {
  const remaining = daysUntil(program.startsAt, todayKey);

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.chip}>
          <AppText style={styles.chipLabel}>{coachLabel(program.coachName)}</AppText>
        </View>
        <AppText style={styles.name} numberOfLines={2}>
          {program.name}
        </AppText>
        <AppText style={styles.start}>
          Parte {formatUpcomingStart(program.startsAt, todayKey)}
        </AppText>
        <AppText style={styles.meta}>
          Valida fino al {formatLongDate(program.expiresAt)}
        </AppText>
        <View style={styles.countdown}>
          <AppText style={styles.countdownValue}>{remaining}</AppText>
          <AppText style={styles.countdownLabel}>
            {remaining === 1 ? "giorno\nall'inizio" : "giorni\nall'inizio"}
          </AppText>
        </View>
        <Button variant="ink" label="Guarda la scheda" onPress={() => onOpen(null)} />
      </View>

      {program.days.length > 0 ? (
        <View style={styles.days}>
          <Heading style={styles.daysTitle}>Cosa ti aspetta</Heading>
          {program.days.map((day) => (
            <Pressable
              key={day.id}
              accessibilityRole="button"
              accessibilityHint="Apre gli esercizi del giorno"
              onPress={() => onOpen(day.id)}
              style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
            >
              <View style={styles.dayBadge}>
                <AppText style={styles.dayBadgeLabel}>
                  {day.weekdays.length > 0 ? WEEKDAY_LABELS_SHORT[day.weekdays[0]!] : "—"}
                </AppText>
              </View>
              <View style={styles.dayText}>
                <AppText tone="heading" style={styles.dayName} numberOfLines={1}>
                  {day.name}
                </AppText>
                <Meta>{formatExerciseCount(day.exerciseCount)}</Meta>
              </View>
              <Chevron />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Meta style={styles.note}>
        Fino ad allora puoi allenarti con una scheda tua dalla tab Schede.
      </Meta>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 2,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  chipLabel: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "800",
  },
  name: {
    color: colors.onAccent,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  start: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "600",
  },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
  },
  countdownValue: {
    color: colors.onAccent,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  countdownLabel: {
    color: colors.onAccent,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700",
  },
  days: {
    gap: spacing.sm,
  },
  daysTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeLabel: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: "800",
  },
  dayText: {
    flex: 1,
    minWidth: 0,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "800",
  },
  note: {
    textAlign: "center",
  },
});
