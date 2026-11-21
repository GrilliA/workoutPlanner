import type { Meta, StoryObj } from "@storybook/react-vite";
import { KpiTiles } from "./KpiTiles";

// Valori tra parentesi quadre: nessun numero inventato (decisione PT del 2026-10-26).
const meta = {
  title: "Coach/Business/KpiTiles",
  component: KpiTiles,
  tags: ["autodocs"],
  args: {
    items: [
      {
        id: "recurring",
        label: "Entrate ricorrenti",
        value: "[importo]",
        hint: "al mese, da [n] clienti",
      },
      { id: "expected", label: "Atteso", value: "[importo]", hint: "rinnovi nei prossimi 30 giorni" },
      {
        id: "collected",
        label: "Incassato questo mese",
        value: "[importo]",
        hint: "pagamenti segnati nel mese",
      },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(56rem, 90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiTiles>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
