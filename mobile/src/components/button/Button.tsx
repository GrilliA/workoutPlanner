import { Pressable, StyleSheet } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText } from "../text";

/** Esportata per lasciare spazio sotto i bottoni flottanti. */
export const BUTTON_MIN_HEIGHT = 58;

type Variant = "primary" | "ink" | "soft" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
};

/**
 * Pulsante pill "Sole": primary arancio (testo cacao), ink scuro (su card arancio),
 * soft arancio tenue, secondary bianco con bordo, ghost solo testo, danger.
 */
export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        (disabled || pressed) && styles.dimmed,
      ]}
    >
      <AppText style={[styles.label, labelStyles[variant]]}>{label}</AppText>
    </Pressable>
  );
}

/** Alias compatibili con le schermate esistenti. */
export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="secondary" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="danger" {...props} />;
}

const styles = StyleSheet.create({
  base: {
    minHeight: BUTTON_MIN_HEIGHT,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  dimmed: {
    opacity: 0.55,
  },
  label: {
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 20,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
  },
  ink: {
    backgroundColor: colors.ink,
  },
  soft: {
    backgroundColor: colors.accentBg,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.onAccent,
  },
  ink: {
    color: colors.onInk,
  },
  soft: {
    color: colors.accentText,
  },
  secondary: {
    color: colors.textHeading,
  },
  ghost: {
    color: colors.accentText,
  },
  danger: {
    color: colors.danger,
  },
});
