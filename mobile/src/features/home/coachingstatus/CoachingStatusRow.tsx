import { StyleSheet, View } from "react-native";
import type { AthleteCoaching } from "../../../api";
import { AppText } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import {
  coachingStatusTone,
  formatCoachingStatus,
  type CoachingStatusTone,
} from "../mappers/coachingLabels";

type CoachingStatusRowProps = {
  /** null o assente = nessun coaching da mostrare (niente coach, abbonamento o stato sconosciuto). */
  coaching: AthleteCoaching | null | undefined;
};

const TONE_COLORS: Record<CoachingStatusTone, { background: string; border: string; text: string }> = {
  data: { background: colors.dataBg, border: colors.dataBg, text: colors.data },
  warning: { background: colors.warningBg, border: colors.warningBg, text: colors.warning },
  neutral: { background: colors.surface, border: colors.border, text: colors.text },
};

/** Stato del coaching in una riga di solo testo: niente prezzi, niente pulsanti. */
export function CoachingStatusRow({ coaching }: CoachingStatusRowProps) {
  if (!coaching) {
    return null;
  }

  const toneColors = TONE_COLORS[coachingStatusTone(coaching.status)];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: toneColors.background, borderColor: toneColors.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: toneColors.text }]} />
      <AppText variant="label" style={[styles.label, { color: toneColors.text }]}>
        {formatCoachingStatus(coaching)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  label: {
    flexShrink: 1,
  },
});
