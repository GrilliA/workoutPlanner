import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardBase } from "@components/card";

const meta = {
  title: "Componenti/CardBase",
  component: CardBase,
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["article", "li", "div"],
    },
  },
  args: {
    as: "article",
    labelledBy: "story-card-base-title",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <CardBase {...args}>
      <span id="story-card-base-title" className="title">
        Layout libero
      </span>
      <span className="meta">Escape hatch per contenuto custom.</span>
    </CardBase>
  ),
} satisfies Meta<typeof CardBase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
