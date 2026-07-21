import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

type CardProps = {
  children: React.ReactNode;
  /** Bordo accent + surface elevata (es. card OGGI). */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Card scura con bordo; `highlight` per il today card. */
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  highlight: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentBorder,
  },
});
