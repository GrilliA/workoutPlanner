import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "../../theme";

type CardProps = {
  children: React.ReactNode;
  /** Fondo arancio tenue + bordo selezione (es. card OGGI). */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Card bianca con ombra morbida, senza bordo; `highlight` per il today card. */
export function Card({ children, highlight = false, style }: CardProps) {
  return (
    <View style={[styles.card, highlight && styles.highlight, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  highlight: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
});
