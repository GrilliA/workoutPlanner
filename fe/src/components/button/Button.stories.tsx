import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ButtonIcon } from "@components/button";

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
  title: "Componenti/Button",
  component: Button,
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
  render: (args) => <Button {...args}>Continua</Button>,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
  render: (args) => <Button {...args}>Annulla</Button>,
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Button size="sm">Piccolo</Button>
      <Button size="md">Medio</Button>
      <Button size="lg">Grande</Button>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
  },
  render: (args) => <Button {...args}>Caricamento…</Button>,
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const IconOnly: Story = {
  render: (args) => (
    <ButtonIcon {...args} aria-label="Avanti">
      {ChevronIcon}
    </ButtonIcon>
  ),
};
