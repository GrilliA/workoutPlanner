import type { Meta, StoryObj } from "@storybook/react-vite";
import { InputBase } from "@components/input";

const meta = {
  title: "Componenti/InputBase",
  component: InputBase,
  tags: ["autodocs"],
  argTypes: {
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    invalid: false,
    disabled: false,
    placeholder: "Push / Pull / Legs",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputBase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
    defaultValue: "??",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "coach@example.com",
    readOnly: true,
  },
};
