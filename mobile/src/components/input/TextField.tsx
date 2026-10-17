import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { fontForWeight } from "../text";

/** Campo testo bianco con bordo caldo, raggio 16. */
export function TextField(props: TextInputProps) {
  const inputStyle = [styles.input, props.style];
  return (
    <TextInput
      placeholderTextColor={colors.text}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[inputStyle, fontForWeight(inputStyle)]}
    />
  );
}

/** Alias corto usato nelle form auth. */
export const Field = TextField;

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.textHeading,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: "500",
  },
});
