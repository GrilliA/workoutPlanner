import type { Meta, StoryObj } from "@storybook/react-vite";
import { LostCard } from "./LostCard";

const MONTHS = ["giu", "lug", "ago", "set", "ott", "nov"];

const meta = {
  title: "Coach/Business/LostCard",
  component: LostCard,
  tags: ["autodocs"],
  args: {
    summary: {
      total: "[n] clienti negli ultimi 6 mesi",
      months: MONTHS.map((label) => ({ label, count: "[n]" })),
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
