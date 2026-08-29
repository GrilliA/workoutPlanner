import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@components/card";

const meta = {
  title: "Componenti/Card",
  component: Card.Root,
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["article", "li", "div"],
    },
  },
  args: {
    as: "article",
    children: (
      <>
        <Card.Title>Push / Pull / Legs</Card.Title>
        <Card.Meta>4 esercizi · 3 serie</Card.Meta>
        <Card.Time dateTime="2026-08-29T18:30">Oggi, 18:30</Card.Time>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Card.Root {...args}>
      <Card.Title>Push / Pull / Legs</Card.Title>
      <Card.Meta>4 esercizi · 3 serie</Card.Meta>
      <Card.Time dateTime="2026-08-29T18:30">Oggi, 18:30</Card.Time>
    </Card.Root>
  ),
} satisfies Meta<typeof Card.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleAndMeta: Story = {
  render: (args) => (
    <Card.Root {...args}>
      <Card.Title>Full body</Card.Title>
      <Card.Meta>6 esercizi · 45 min</Card.Meta>
    </Card.Root>
  ),
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
