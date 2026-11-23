import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdherenceCard } from "./AdherenceCard";

const today = "2026-11-23";
const week = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", today];

// Nessun numero inventato (decisione PT del 2026-10-26): la settimana è vuota.
const emptyWeek = week.map((date) => ({
  date,
  mealCount: 0,
  doneCount: 0,
  otherCount: 0,
  removedCount: 0,
}));

const meta = {
  title: "Coach/Alimentazione/AdherenceCard",
  component: AdherenceCard,
  tags: ["autodocs"],
  args: { days: emptyWeek, isPending: false, today },
  decorators: [
    (Story) => (
      <div style={{ width: "min(20rem, 90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdherenceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SettimanaVuota: Story = {};

export const Caricamento: Story = {
  args: { days: undefined, isPending: true },
};

export const NonDisponibile: Story = {
  args: { days: undefined, isPending: false },
};
