import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../../theme";
import { AppText } from "../text";
import {
  BAR_PADDING,
  CLOSED_FLEX,
  ICON_SIZE,
  LABEL_GAP,
  OPEN_FLEX,
  OPEN_TAB_PADDING,
  TAB_GAP,
  activeLabelFits,
  activePillContentWidth,
  isHiddenTabStyle,
} from "./tabBarLayout";

const TAB_WIDTH_MS = 260;
const LABEL_MAX_WIDTH = 104;
/** Con il testo di sistema molto grande l'etichetta cresce al massimo del 30%. */
const LABEL_MAX_FONT_SCALE = 1.3;
/**
 * Colore della pill attiva: cacao in Allenamento, indaco in Alimentazione.
 * `clear` è lo stesso colore con alfa 0, così durante l'animazione la pill non vira di tinta.
 * Testo e icone sopra restano bianchi (`onInk` / `onData`, contrasto in `check-contrast`).
 */
const ACTIVE_PILL_COLORS = {
  ink: { fill: colors.ink, clear: "rgba(35, 26, 20, 0)", content: colors.onInk },
  data: { fill: colors.data, clear: "rgba(59, 63, 158, 0)", content: colors.onData },
} as const;

type ActivePillTone = keyof typeof ACTIVE_PILL_COLORS;

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
  /** Colore della pill attiva per modalità (default cacao). */
  activePillTone?: ActivePillTone;
};

type TabBarItemProps = {
  focused: boolean;
  activePillTone: ActivePillTone;
  /** Spazio per icona + etichetta nella pill aperta; null finché la barra non è misurata. */
  openContentWidth: number | null;
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
  activePillTone,
  openContentWidth,
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

  const pillColors = ACTIVE_PILL_COLORS[activePillTone];
  // Larghezza naturale dell'etichetta, misurata fuori schermo. Se non ci sta intera
  // accanto all'icona, la pill aperta mostra solo l'icona (mai "O…" o "Pi…");
  // il nome resta nell'etichetta di accessibilità.
  const [labelWidth, setLabelWidth] = useState<number | null>(null);
  const isMeasured = openContentWidth !== null && labelWidth !== null;
  const showLabel = !isMeasured || activeLabelFits(openContentWidth, labelWidth);
  const pillStyle = {
    flexGrow: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_FLEX, OPEN_FLEX],
    }),
    paddingHorizontal: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, OPEN_TAB_PADDING],
    }),
    backgroundColor: openProgress.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [pillColors.clear, pillColors.fill, pillColors.fill],
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
    opacity: showLabel ? openProgress : 0,
    maxWidth: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, showLabel ? LABEL_MAX_WIDTH : 0],
    }),
    marginLeft: openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, showLabel ? LABEL_GAP : 0],
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
          <AppText
            style={[styles.label, { color: pillColors.content }]}
            numberOfLines={1}
            maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
          >
            {label}
          </AppText>
        </Animated.View>
      </Pressable>
      <View
        style={styles.measureLayer}
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppText
          style={styles.label}
          numberOfLines={1}
          maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
          onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
        >
          {label}
        </AppText>
      </View>
    </Animated.View>
  );
}

/**
 * Tab bar flottante "Sole", identica per Android/iOS/web: pill bianca con ombra;
 * la tab attiva è una pill ink (indaco in Alimentazione) con icona + etichetta, le altre solo icona.
 * Le route con `href: null` (l'altra modalità) non si disegnano.
 */
export function GlassTabBar({
  state,
  descriptors,
  navigation,
  insets,
  hasUnseenAssignment = false,
  activePillTone = "ink",
}: GlassTabBarProps) {
  const openContentColor = ACTIVE_PILL_COLORS[activePillTone].content;
  const bottomOffset = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET);
  const [barWidth, setBarWidth] = useState<number | null>(null);
  const visibleTabCount = state.routes.filter(
    (route) => !isHiddenTabStyle(descriptors[route.key]?.options?.tabBarItemStyle),
  ).length;
  const openContentWidth =
    barWidth === null ? null : activePillContentWidth(barWidth, visibleTabCount);

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          if (isHiddenTabStyle(options?.tabBarItemStyle)) {
            return null;
          }
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
              activePillTone={activePillTone}
              openContentWidth={openContentWidth}
              label={label}
              closedIcon={
                renderIcon?.({ focused: false, color: colors.text, size: 23 }) ?? null
              }
              openIcon={
                renderIcon?.({ focused: true, color: openContentColor, size: 23 }) ?? null
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
    gap: TAB_GAP,
    padding: BAR_PADDING,
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
    width: ICON_SIZE,
    height: ICON_SIZE,
    position: "relative",
  },
  iconOpen: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  measureLayer: {
    position: "absolute",
    left: -10000,
    top: 0,
    width: 1000,
    flexDirection: "row",
    alignItems: "flex-start",
    opacity: 0,
  },
  labelClip: {
    overflow: "hidden",
    // Con il testo grande la pill è più stretta dell'etichetta: si accorcia l'etichetta, non l'icona.
    flexShrink: 1,
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
