import type { Meta, StoryObj } from "@storybook/react-vite";
import { CoachCardListSkeleton } from "./CoachCardListSkeleton";

const meta = {
  title: "Coach/CoachCardListSkeleton",
  component: CoachCardListSkeleton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CoachCardListSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Caricamento: Story = {};
