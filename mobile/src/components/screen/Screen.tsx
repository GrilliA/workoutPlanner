import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../theme";

type ScreenProps = {
  children: React.ReactNode;
  /** Se false, niente padding orizzontale/verticale interno. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Contenitore pagina con safe-area e sfondo app. */
export function Screen({ children, padded = true, style }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  padded: {
    padding: spacing.lg,
  },
});
