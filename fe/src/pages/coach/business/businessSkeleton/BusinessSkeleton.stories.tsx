import type { Meta, StoryObj } from "@storybook/react-vite";
import { BusinessSkeleton } from "./BusinessSkeleton";

const meta = {
  title: "Coach/Business/BusinessSkeleton",
  component: BusinessSkeleton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "min(56rem, 90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BusinessSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
