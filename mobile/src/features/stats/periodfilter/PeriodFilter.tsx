import { Pressable, StyleSheet, View } from "react-native";
import type { StatsRange } from "../../../api";
import { AppText } from "../../../components";
import { colors, radii, shadows } from "../../../theme";
import { PROGRESS_RANGE_OPTIONS } from "../mappers/formatters";

type PeriodFilterProps = {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
};

/** Segmented "Sole": pill bianca, periodo attivo = pill ink. */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Periodo"
    >
      {PROGRESS_RANGE_OPTIONS.map((option) => {
        const isSelected = option.range === value;

        return (
          <Pressable
            key={option.range}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.range)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <AppText
              variant="label"
              style={isSelected ? styles.labelSelected : styles.label}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  segmentSelected: {
    backgroundColor: colors.ink,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
  },
  labelSelected: {
    color: colors.onInk,
    fontWeight: "700",
  },
});
