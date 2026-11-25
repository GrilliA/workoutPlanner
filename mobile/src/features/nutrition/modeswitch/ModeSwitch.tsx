import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Icon, type IconName } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { AppMode } from "../appmode/appMode";
import { useAppMode } from "../appmode/AppModeProvider";

type ModeOption = {
  mode: AppMode;
  label: string;
  icon: IconName;
  /** Colore del modulo sull'opzione scelta: arancio scuro o indaco. */
  selectedColor: string;
};

const MODE_OPTIONS: ModeOption[] = [
  { mode: "training", label: "Allenamento", icon: "workout", selectedColor: colors.accentText },
  { mode: "nutrition", label: "Alimentazione", icon: "meals", selectedColor: colors.data },
];

/**
 * Switch Allenamento / Alimentazione in cima alla Home: pill chiara, centrata e compatta,
 * diversa dalla tab bar perché cambia sezione dell'app. Nascosto senza piano pasti attivo.
 */
export function ModeSwitch() {
  const { mode, isNutritionAvailable, chooseMode } = useAppMode();

  if (!isNutritionAvailable) {
    return null;
  }

  return (
    // `role` e `aria-*`: react-native-web non porta `accessibilityState.checked` nel DOM.
    <View role="radiogroup" aria-label="Sezione dell'app" style={styles.group}>
      {MODE_OPTIONS.map((option) => {
        const isSelected = option.mode === mode;
        const color = isSelected ? option.selectedColor : colors.text;
        return (
          <Pressable
            key={option.mode}
            role="radio"
            aria-label={option.label}
            aria-checked={isSelected}
            onPress={() => chooseMode(option.mode)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Icon name={option.icon} size={20} color={color} />
            <AppText style={[styles.label, isSelected && styles.labelSelected, { color }]}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const OPTION_MIN_HEIGHT = 44;
const GROUP_PADDING = 3;

const styles = StyleSheet.create({
  group: {
    alignSelf: "center",
    maxWidth: "100%",
    flexDirection: "row",
    // Con il testo molto grande su uno schermo stretto la seconda opzione va a capo.
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
    padding: GROUP_PADDING,
    borderRadius: OPTION_MIN_HEIGHT / 2 + GROUP_PADDING,
    backgroundColor: colors.border,
  },
  option: {
    minHeight: OPTION_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  optionSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  labelSelected: {
    fontWeight: "800",
  },
});
