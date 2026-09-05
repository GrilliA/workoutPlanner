import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonIcon } from "@components/button";

const ChevronIcon = (
  <svg viewBox="0 0 16 16" fill="none">
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
  title: "Componenti/ButtonIcon",
  component: ButtonIcon,
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
    "aria-label": "Avanti",
  },
  render: (args) => <ButtonIcon {...args}>{ChevronIcon}</ButtonIcon>,
} satisfies Meta<typeof ButtonIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <ButtonIcon size="sm" aria-label="Avanti piccolo">
        {ChevronIcon}
      </ButtonIcon>
      <ButtonIcon size="md" aria-label="Avanti medio">
        {ChevronIcon}
      </ButtonIcon>
      <ButtonIcon size="lg" aria-label="Avanti grande">
        {ChevronIcon}
      </ButtonIcon>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
