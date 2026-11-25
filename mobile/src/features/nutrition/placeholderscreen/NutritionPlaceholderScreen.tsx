import { ScrollView, StyleSheet, View } from "react-native";
import { AppText, Icon, Meta, Screen, Title, useTabBarInset } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { ModeSwitch } from "../modeswitch";

type NutritionPlaceholderScreenProps = {
  title: string;
  /** Riga sopra il titolo (es. la data di oggi). */
  overline?: string;
  heading: string;
  body: string;
  /** Lo switch Allenamento / Alimentazione sta solo in Oggi, come nella Home. */
  showModeSwitch?: boolean;
};

/**
 * Schermata provvisoria della modalità Alimentazione: le schermate vere
 * (Oggi e Piano pasti in AL6, Progressi in AL7) prendono il suo posto.
 */
export function NutritionPlaceholderScreen({
  title,
  overline,
  heading,
  body,
  showModeSwitch = false,
}: NutritionPlaceholderScreenProps) {
  const tabBarInset = useTabBarInset();

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        {showModeSwitch ? <ModeSwitch /> : null}
        <View style={styles.header}>
          {overline ? <Meta style={styles.overline}>{overline}</Meta> : null}
          <Title>{title}</Title>
        </View>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Icon name="meals" size={24} color={colors.data} />
          </View>
          <AppText style={styles.heading}>{heading}</AppText>
          <AppText style={styles.body}>{body}</AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  overline: {
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.dataBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heading: {
    color: colors.data,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  body: {
    color: colors.data,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
});
