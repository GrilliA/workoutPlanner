import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { AppText, Meta } from "../text";

type ListRowProps = {
  title: string;
  meta?: string;
  onPress?: () => void;
};

/** Riga lista (sessioni / schede) con titolo + meta. */
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
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
});
