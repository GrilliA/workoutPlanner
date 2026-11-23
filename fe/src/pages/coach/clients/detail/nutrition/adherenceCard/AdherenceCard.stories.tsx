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

// Valori di forma, non dati reali: servono solo a far vedere le barre con "fatto" e "altro".
// Ogni giorno ha 4 pasti nel piano; la percentuale nel testo segue questi valori.
const shapeWeek = [
  { doneCount: 4, otherCount: 0 },
  { doneCount: 2, otherCount: 1 },
  { doneCount: 0, otherCount: 3 },
  { doneCount: 3, otherCount: 1 },
  { doneCount: 1, otherCount: 0 },
  { doneCount: 0, otherCount: 0 },
  { doneCount: 2, otherCount: 2 },
].map((counts, index) => ({
  date: week[index],
  mealCount: 4,
  removedCount: 0,
  ...counts,
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

export const ConFattiEAltro: Story = {
  args: { days: shapeWeek },
  decorators: [
    (Story) => (
      <>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem" }}>
          [Valori di forma, non dati reali: servono a mostrare le barre]
        </p>
        <Story />
      </>
    ),
  ],
};

export const Caricamento: Story = {
  args: { days: undefined, isPending: true },
};

export const NonDisponibile: Story = {
  args: { days: undefined, isPending: false },
};
