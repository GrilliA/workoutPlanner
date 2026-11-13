import type { Meta, StoryObj } from "@storybook/react-vite";
import { RenewalsCard } from "./RenewalsCard";

const meta = {
  title: "Coach/Business/RenewalsCard",
  component: RenewalsCard,
  tags: ["autodocs"],
  args: {
    summary: {
      value: "[percentuale]",
      hint: "[n] clienti su [n] hanno rinnovato negli ultimi 90 giorni",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RenewalsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NessunaScadenza: Story = {
  args: {
    summary: { value: null, hint: "Nessun cliente con una scadenza negli ultimi 90 giorni." },
  },
};
