import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Body, Heading, Mascot } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";

type RestDayCardProps = {
  /** "Prossimo allenamento: domani · Pull", se c'è nei prossimi 7 giorni. */
  nextWorkoutLabel: string | null;
  onTrainAnyway: () => void;
};

/** Oggi niente in calendario: la mascotte dorme, ci si può allenare lo stesso. */
export function RestDayCard({ nextWorkoutLabel, onTrainAnyway }: RestDayCardProps) {
  return (
    <View style={styles.card}>
      <Mascot name="sleeping" size={150} />
      <Heading style={styles.title}>Oggi si recupera</Heading>
      {nextWorkoutLabel ? (
        <Body style={styles.body}>{nextWorkoutLabel}</Body>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onTrainAnyway}
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <AppText variant="label" tone="accent" style={styles.linkLabel}>
          Allenati comunque
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.card,
  },
  title: {
    textAlign: "center",
  },
  body: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
  link: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});
