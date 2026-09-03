import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@components/card";

const meta = {
  title: "Componenti/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["article", "li", "div"],
    },
  },
  args: {
    as: "article",
    title: "Push / Pull / Legs",
    meta: "4 esercizi · 3 serie",
    time: "Oggi, 18:30",
    dateTime: "2026-08-29T18:30",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleAndMeta: Story = {
  args: {
    title: "Full body",
    meta: "6 esercizi · 45 min",
    time: undefined,
    dateTime: undefined,
  },
};

export const AsListItem: Story = {
  args: {
    as: "li",
  },
  decorators: [
    (Story) => (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", width: "22rem" }}>
        <Story />
      </ul>
    ),
  ],
};
