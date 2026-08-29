import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrandLogo } from "@components/brandLogo";

const meta = {
  title: "Componenti/BrandLogo",
  component: BrandLogo,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    layout: {
      control: "select",
      options: ["stack", "inline"],
    },
    mark: {
      control: "select",
      options: ["coach", "none"],
    },
  },
  args: {
    size: "md",
    layout: "inline",
    mark: "none",
  },
} satisfies Meta<typeof BrandLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <BrandLogo size="sm" />
      <BrandLogo size="md" />
      <BrandLogo size="lg" />
    </div>
  ),
};

export const Stack: Story = {
  args: {
    layout: "stack",
    size: "lg",
  },
};

export const CoachMark: Story = {
  args: {
    size: "sm",
    layout: "inline",
    mark: "coach",
  },
};
