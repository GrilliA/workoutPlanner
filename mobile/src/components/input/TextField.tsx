import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "../../theme";

/** Campo testo scuro con bordo, allineato agli input web. */
export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

/** Alias corto usato nelle form auth. */
export const Field = TextField;

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.textHeading,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
});
