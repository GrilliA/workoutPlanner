import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SelectBase, type SelectBaseProps } from "@components/select";

function ControlledSelectBase(args: SelectBaseProps) {
  const [value, setValue] = useState(args.value);
  return <SelectBase {...args} value={value} onChange={setValue} />;
}

const meta = {
  title: "Componenti/SelectBase",
  component: SelectBase,
  tags: ["autodocs"],
  argTypes: {
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Unità carico",
    value: "kg",
    options: [
      { value: "kg", label: "kg" },
      { value: "percent_1rm", label: "% 1RM" },
    ],
    onChange: () => {},
    invalid: false,
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledSelectBase {...args} />,
} satisfies Meta<typeof SelectBase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
