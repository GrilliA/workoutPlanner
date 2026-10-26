import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, type SelectProps } from "@components/select";

const CLIENT_OPTIONS = [
  { value: "1", label: "Giulia Rossi" },
  { value: "2", label: "Marco Bianchi" },
  { value: "3", label: "Sara Verdi" },
];

function ControlledSelect(args: SelectProps) {
  const [value, setValue] = useState(args.value);
  return <Select {...args} value={value} onChange={setValue} />;
}

const meta = {
  title: "Componenti/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {
    error: { control: "text" },
    helper: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    id: "story-select",
    value: "",
    options: CLIENT_OPTIONS,
    onChange: () => {},
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledSelect {...args} />,
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: "Cliente",
  },
};

export const WithError: Story = {
  args: {
    label: "Cliente",
    error: "Seleziona un cliente.",
  },
};

export const Helper: Story = {
  args: {
    label: "Template (opzionale)",
    helper: "Lascia vuoto per partire da zero.",
  },
};

export const Required: Story = {
  args: {
    label: "Cliente",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Cliente",
    disabled: true,
    value: "1",
  },
};
