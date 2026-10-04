import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { colors } from "../../theme";

type GlassTabBarProps = BottomTabBarProps & {
  /** Badge "scheda nuova" sull'icona Schede — dati reali collegati in M3d. */
  hasUnseenAssignment?: boolean;
};

/**
 * Tab bar flottante in vetro stile Telegram, identica per Android/iOS/web.
 * Spec: `docs/mockups/mobile-simple.html` (`.tabbar`, `.tab`, `.badge-num`).
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
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 26) }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={30} tint="dark" style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = (options?.title as string) ?? route.name;
          const color = focused ? colors.accent : "#9a9ea8";
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
                    <Text style={styles.badgeText}>1</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
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
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    padding: 6,
    backgroundColor: "rgba(44, 48, 56, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 32,
  },
  tabOn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
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
    borderRadius: 9,
    backgroundColor: "#ff3b30",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(40, 44, 52, 0.9)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "600",
  },
});
