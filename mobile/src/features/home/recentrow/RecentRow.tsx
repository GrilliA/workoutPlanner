import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { HomeRecentSession } from "../types";

type RecentRowProps = {
  session: HomeRecentSession;
  onPress?: () => void;
};

/** Riga ultimi allenamenti: titolo, data·durata, volume a destra. */
export function RecentRow({ session, onPress }: RecentRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={styles.row}
    >
      <View style={styles.icon}>
        <AppText tone="accent" style={styles.iconGlyph}>
          ●
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText tone="heading" style={styles.title} numberOfLines={1}>
          {session.name}
        </AppText>
        <Meta>
          {session.dateLabel} · {session.durationMin} min
        </Meta>
      </View>
      <AppText tone="heading" style={styles.volume}>
        {session.volumeLabel}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    fontSize: 10,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  volume: {
    fontSize: 14,
    fontWeight: "700",
  },
});
