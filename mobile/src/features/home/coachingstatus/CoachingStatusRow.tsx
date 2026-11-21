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
  const { title, detail } = formatCoachingStatus(coaching);

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: toneColors.background, borderColor: toneColors.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: toneColors.text }]} />
      <View style={styles.texts}>
        <AppText variant="label" style={{ color: toneColors.text }}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="meta" style={{ color: toneColors.text }}>
            {detail}
          </AppText>
        ) : null}
      </View>
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
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  texts: {
    flexShrink: 1,
  },
});
