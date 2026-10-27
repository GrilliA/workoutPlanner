import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { UnitInput } from "@components/unitInput";

const LOAD_UNITS = ["kg", "percent_1rm"] as const;
type LoadUnit = (typeof LOAD_UNITS)[number];

const LOAD_UNIT_LABELS: Record<LoadUnit, string> = {
  kg: "kg",
  percent_1rm: "% 1RM",
};

type LoadInputProps = {
  startUnit: LoadUnit;
  defaultValue?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/** The tag changes unit on click, as in the set editor. */
function LoadInput({ startUnit, ...props }: LoadInputProps) {
  const [unit, setUnit] = useState<LoadUnit>(startUnit);

  return (
    <UnitInput
      type="number"
      min={0}
      step={0.5}
      placeholder="–"
      aria-label="Carico"
      unitAriaLabel="Unità carico"
      unit={unit}
      units={LOAD_UNITS}
      unitLabels={LOAD_UNIT_LABELS}
      onUnitChange={setUnit}
      {...props}
    />
  );
}

const meta = {
  title: "Componenti/UnitInput",
  component: LoadInput,
  tags: ["autodocs"],
  argTypes: {
    startUnit: { control: "inline-radio", options: LOAD_UNITS },
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    startUnit: "kg",
    invalid: false,
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "8rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoadInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithValue: Story = {
  args: { defaultValue: "102.5" },
};

export const Percent: Story = {
  args: { startUnit: "percent_1rm", defaultValue: "80" },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: "1112" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "60" },
};
