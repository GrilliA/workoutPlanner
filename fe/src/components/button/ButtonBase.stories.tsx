import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonBase } from "@components/button";

const ChevronIcon = (
  <svg viewBox="0 0 16 16" fill="none" width="1em" height="1em">
    <path
      d="M6 3.5 10.5 8 6 12.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const meta = {
  title: "Componenti/ButtonBase",
  component: ButtonBase,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
  },
  render: (args) => <ButtonBase {...args}>Continua</ButtonBase>,
} satisfies Meta<typeof ButtonBase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomContent: Story = {
  render: (args) => (
    <ButtonBase {...args}>
      {ChevronIcon}
      <span>Prosegui</span>
    </ButtonBase>
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
