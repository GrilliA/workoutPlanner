import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Icon, type IconName } from "../../../components";
import { colors, radii, spacing } from "../../../theme";

export type SettingsRowTone = "data" | "accent" | "warning" | "danger";

type SettingsRowProps = {
  icon: IconName;
  tone: SettingsRowTone;
  title: string;
  /** Valore a destra (es. nome del coach). */
  value?: string;
  onPress: () => void;
  /** Riga distruttiva (Esci): titolo rosso, niente freccia. */
  isDanger?: boolean;
};

const TILE = {
  data: { background: colors.dataBg, icon: colors.data },
  accent: { background: colors.accentBg, icon: colors.accentText },
  warning: { background: colors.warningBg, icon: colors.warning },
  danger: { background: colors.dangerBg, icon: colors.danger },
} as const;

/** Riga di Account: icona su tile colorata, titolo, valore, freccia. */
export function SettingsRow({
  icon,
  tone,
  title,
  value,
  onPress,
  isDanger = false,
}: SettingsRowProps) {
  const tile = TILE[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: tile.background }]}>
        <Icon name={icon} color={tile.icon} size={20} />
      </View>
      <AppText
        tone={isDanger ? "danger" : "heading"}
        style={styles.title}
        numberOfLines={1}
      >
        {title}
      </AppText>
      {value ? (
        <AppText style={styles.value} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {isDanger ? null : <AppText style={styles.chevron}>›</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radii.md - 4,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  value: {
    maxWidth: "45%",
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  chevron: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "600",
  },
});
