import type { Meta, StoryObj } from "@storybook/react-vite";
import { MealTagRow } from "./MealTagRow";

const meta = {
  title: "Coach/Alimentazione/MealTagRow",
  component: MealTagRow,
  tags: ["autodocs"],
  args: {
    // Nessun numero inventato: il tag non è ancora usato.
    tag: { id: 1, name: "Colazione", position: 0, archivedAt: null, planCount: 0, templateCount: 0 },
    index: 0,
    count: 5,
    isRenaming: false,
    onMove: () => undefined,
    onRename: () => undefined,
    onArchive: () => undefined,
  },
  decorators: [
    (Story) => (
      <ol data-reorder-list style={{ width: "min(40rem, 92vw)", margin: 0, padding: 0, listStyle: "none" }}>
        <Story />
      </ol>
    ),
  ],
} satisfies Meta<typeof MealTagRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
