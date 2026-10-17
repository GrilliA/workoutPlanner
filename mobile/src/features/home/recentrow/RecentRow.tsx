import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";

type RecentRowProps = {
  /** null = nessun allenamento completato finora. */
  session: { title: string; meta: string } | null;
  onPress?: () => void;
};

/** Tile "Ultimo allenamento" della Home: titolo, data · volume, tap → riepilogo. */
export function RecentRow({ session, onPress }: RecentRowProps) {
  const content = (
    <>
      <Meta>Ultimo allenamento</Meta>
      {session ? (
        <View style={styles.body}>
          <AppText tone="heading" style={styles.title} numberOfLines={1}>
            {session.title}
          </AppText>
          <Meta numberOfLines={2}>{session.meta}</Meta>
        </View>
      ) : (
        <AppText tone="heading" style={styles.title}>
          Ancora nessuno
        </AppText>
      )}
    </>
  );

  if (!session || !onPress) {
    return <View style={styles.tile}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    gap: 2,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
});
