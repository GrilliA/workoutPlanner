import { Pressable, StyleSheet, View } from "react-native";
import type { AthleteHome } from "../../../api";
import { AppText, Meta } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { formatUpcomingStart } from "../mappers/homeLabels";
import { Chevron } from "./Chevron";

type UpcomingProgramBannerProps = {
  program: NonNullable<AthleteHome["upcomingProgram"]>;
  todayKey: string;
  onOpen: () => void;
};

/** Sopra la scheda in uso: avvisa che ne arriva una nuova e da quando. */
export function UpcomingProgramBanner({ program, todayKey, onOpen }: UpcomingProgramBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText tone="heading" style={styles.title}>
          Nuova scheda da {formatUpcomingStart(program.startsAt, todayKey)}
        </AppText>
        <Meta numberOfLines={1}>{program.name} · prende il posto di quella attuale</Meta>
      </View>
      <Chevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.accentBg,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
});
