import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../../theme";
import { AppText } from "../text";

const TAB_WIDTH_MS = 260;
const CLOSED_FLEX = 1;
const OPEN_FLEX = 1.8;
const LABEL_MAX_WIDTH = 104;
/** Stesso cacao di `colors.ink`, alfa 0, così la pill non vira di tinta. */
const INK_CLEAR = "rgba(35, 26, 20, 0)";

/** Condivisi con le pill flottanti delle altre schermate (es. fine allenamento). */
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_MIN_BOTTOM_OFFSET = 26;

/**
 * Padding bottom completo per le schermate tab: la pill è assoluta
 * e non riporta la sua altezza a React Navigation
 * (altezza barra + offset dal bordo o safe-area + margine).
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET);
  return TAB_BAR_HEIGHT + bottomOffset + spacing.xl;
}

type GlassTabBarProps = BottomTabBarProps & {
  /** Badge "scheda nuova" sull'icona Schede — dati reali collegati in M3d. */
  hasUnseenAssignment?: boolean;
};

type TabBarItemProps = {
  focused: boolean;
  label: string;
  closedIcon: ReactNode;
  openIcon: ReactNode;
  showBadge: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** La tab attiva si apre in larghezza, quella precedente si chiude. */
function TabBarItem({
  focused,
  label,
  closedIcon,
  openIcon,
  showBadge,
  onPress,
  onLongPress,
}: TabBarItemProps) {
  const openProgress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(openProgress, {
      toValue: focused ? 1 : 0,
      duration: TAB_WIDTH_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, openProgress]);

  const pillStyle = {
    flexGrow: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_FLEX, OPEN_FLEX],
    }),
    paddingHorizontal: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, spacing.md],
    }),
    backgroundColor: openProgress.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [INK_CLEAR, colors.ink, colors.ink],
    }),
  };
  const closedIconStyle = {
    opacity: openProgress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [1, 0, 0],
    }),
  };
  const openIconStyle = {
    opacity: openProgress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 1, 1],
    }),
  };
  const labelStyle = {
    opacity: openProgress,
    maxWidth: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, LABEL_MAX_WIDTH],
    }),
    marginLeft: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 6],
    }),
  };

  return (
    <Animated.View style={[styles.tab, pillStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <Animated.View style={closedIconStyle}>{closedIcon}</Animated.View>
          <Animated.View style={[styles.iconOpen, openIconStyle]}>{openIcon}</Animated.View>
          {showBadge ? (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>1</AppText>
            </View>
          ) : null}
        </View>
        <Animated.View style={[styles.labelClip, labelStyle]}>
          <AppText style={styles.label} numberOfLines={1}>
            {label}
          </AppText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

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
  const bottomOffset = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET);

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = (options?.title as string) ?? route.name;
          const renderIcon =
            typeof options?.tabBarIcon === "function" ? options.tabBarIcon : null;
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
            <TabBarItem
              key={route.key}
              focused={focused}
              label={label}
              closedIcon={
                renderIcon?.({ focused: false, color: colors.text, size: 23 }) ?? null
              }
              openIcon={
                renderIcon?.({ focused: true, color: colors.onInk, size: 23 }) ?? null
              }
              showBadge={showBadge}
              onPress={onPress}
              onLongPress={onLongPress}
            />
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
    height: TAB_BAR_HEIGHT,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
    padding: 6,
    backgroundColor: colors.surface,
    ...shadows.tabBar,
  },
  tab: {
    flexBasis: 0,
    flexShrink: 1,
    borderRadius: radii.pill,
  },
  hit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 23,
    height: 23,
    position: "relative",
  },
  iconOpen: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  labelClip: {
    overflow: "hidden",
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
    color: colors.onInk,
  },
});
