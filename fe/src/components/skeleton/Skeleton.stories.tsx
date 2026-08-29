import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@components/skeleton";

const meta = {
  title: "Componenti/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["block", "text"],
    },
    width: { control: "text" },
    height: { control: "text" },
  },
  args: {
    variant: "block",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Block: Story = {
  args: {
    variant: "block",
    height: "8rem",
  },
};

export const Text: Story = {
  args: {
    variant: "text",
    width: "70%",
  },
};

export const CardPlaceholder: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1rem 1.25rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--bg)",
      }}
    >
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="block" height="4.5rem" />
    </div>
  ),
};
