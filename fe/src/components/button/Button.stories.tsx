import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@components/button";

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
  component: Button.Root,
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
  render: (args) => (
    <Button.Root {...args}>
      <Button.Label>Continua</Button.Label>
    </Button.Root>
  ),
} satisfies Meta<typeof Button.Root>;

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
  render: (args) => (
    <Button.Root {...args}>
      <Button.Label>Annulla</Button.Label>
    </Button.Root>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Button.Root size="sm">
        <Button.Label>Piccolo</Button.Label>
      </Button.Root>
      <Button.Root size="md">
        <Button.Label>Medio</Button.Label>
      </Button.Root>
      <Button.Root size="lg">
        <Button.Label>Grande</Button.Label>
      </Button.Root>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
  },
  render: (args) => (
    <Button.Root {...args}>
      <Button.Spinner />
      <Button.Label>Caricamento…</Button.Label>
    </Button.Root>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithIcon: Story = {
  render: (args) => (
    <Button.Root {...args}>
      <Button.Icon position="start">{ChevronIcon}</Button.Icon>
      <Button.Label>Continua</Button.Label>
    </Button.Root>
  ),
};
