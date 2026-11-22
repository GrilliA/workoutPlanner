import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CollectedBar } from "../types";
import { CollectedChart } from "./CollectedChart";

// Le altezze sono solo forme; importi tra parentesi quadre, nessun numero inventato.
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const SHAPES = [0.4, 0.55, 0, 0.7, 0.5, 1, 0.65, 0.3, 0.8, 0.6, 0.9, 0.45];

const barsOf = (count: number): CollectedBar[] =>
  MONTHS.slice(0, count).map((label, index) => ({
    label,
    heightRatio: SHAPES[index] ?? 0,
    isCurrentMonth: index === count - 1,
    accessibilityLabel: `${label} [anno]: [importo]`,
    compactAmount: "[€]",
    amount: "[importo]",
  }));

const meta = {
  title: "Coach/Business/CollectedChart",
  component: CollectedChart,
  tags: ["autodocs"],
  args: {
    model: { bars: barsOf(6), summary: "[importo] incassati negli ultimi 6 mesi." },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(40rem, 90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CollectedChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeiMesi: Story = {};

export const DodiciMesi: Story = {
  args: {
    model: { bars: barsOf(12), summary: "[importo] incassati negli ultimi 12 mesi." },
  },
};

export const MobileDodiciMesi: Story = {
  args: DodiciMesi.args,
  decorators: [
    (Story) => (
      <div style={{ width: "21rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const SenzaIncassi: Story = {
  args: {
    model: {
      bars: barsOf(6).map((bar) => ({ ...bar, heightRatio: 0 })),
      summary: "Nessun pagamento segnato negli ultimi 6 mesi.",
    },
  },
};
