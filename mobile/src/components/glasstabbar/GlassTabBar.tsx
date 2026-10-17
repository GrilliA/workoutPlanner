import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../../theme";
import { AppText } from "../text";

const BAR_HEIGHT = 64;
const MIN_BOTTOM_OFFSET = 26;

/**
 * Padding bottom completo per le schermate tab: la pill è assoluta
 * e non riporta la sua altezza a React Navigation
 * (altezza barra + offset dal bordo o safe-area + margine).
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return (
    BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_OFFSET) + spacing.xl
  );
}

type GlassTabBarProps = BottomTabBarProps & {
  /** Badge "scheda nuova" sull'icona Schede — dati reali collegati in M3d. */
  hasUnseenAssignment?: boolean;
};

/**
 * Tab bar flottante "Sole", identica per Android/iOS/web: pill bianca con ombra;
 * la tab attiva è una pill ink con icona + etichetta, le altre solo icona.
 */
export function GlassTabBar({
  state,
  descriptors,
  navigation,
  insets,
  hasUnseenAssignment = false,
}: GlassTabBarProps) {
  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom, MIN_BOTTOM_OFFSET) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = (options?.title as string) ?? route.name;
          const color = focused ? colors.onInk : colors.text;
          const icon =
            typeof options?.tabBarIcon === "function"
              ? options.tabBarIcon({ focused, color, size: 23 })
              : options?.tabBarIcon;
          const showBadge = route.name === "workouts" && hasUnseenAssignment;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabOn,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconWrap}>
                {icon}
                {showBadge ? (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText}>1</AppText>
                  </View>
                ) : null}
              </View>
              {focused ? (
                <AppText style={[styles.label, { color }]} numberOfLines={1}>
                  {label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 15,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
    padding: 6,
    backgroundColor: colors.surface,
    ...shadows.tabBar,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.pill,
  },
  tabOn: {
    flex: 1.8,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -11,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.onDanger,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
});
