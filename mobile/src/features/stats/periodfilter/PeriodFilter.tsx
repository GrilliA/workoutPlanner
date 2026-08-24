import { Pressable, StyleSheet, View } from "react-native";
import type { StatsRange } from "../../../api";
import { Meta } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { PROGRESS_RANGE_OPTIONS } from "../mappers/formatters";

type PeriodFilterProps = {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
};

/** Segmented control 4 SETT / 12 SETT / 1 ANNO. */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Filtro periodo"
    >
      {PROGRESS_RANGE_OPTIONS.map((option) => {
        const selected = option.range === value;

        return (
          <Pressable
            key={option.range}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.range)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Meta style={selected ? styles.labelSelected : undefined}>
              {option.label}
            </Meta>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  labelSelected: {
    color: colors.textHeading,
    fontWeight: "700",
  },
});
