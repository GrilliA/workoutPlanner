import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { AppText, Meta } from "../text";

type ListRowProps = {
  title: string;
  meta?: string;
  onPress?: () => void;
};

/** Riga lista (sessioni / schede) con titolo + meta, separatore `border`. */
export function ListRow({ title, meta, onPress }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <AppText tone="heading" style={styles.title}>
        {title}
      </AppText>
      {meta ? <Meta>{meta}</Meta> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
