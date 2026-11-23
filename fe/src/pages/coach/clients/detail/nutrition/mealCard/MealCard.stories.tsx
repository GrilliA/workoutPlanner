import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { DraftMeal, MealPlanDraft } from "../mappers/mealPlanDraft";
import { MealCard } from "./MealCard";

const tagOptions = [
  { value: "1", label: "Colazione" },
  { value: "2", label: "Spuntino" },
  { value: "3", label: "Pranzo" },
  { value: "5", label: "Cena" },
];

const breakfast: DraftMeal = {
  key: "colazione",
  tagId: 1,
  timeOfDay: "07:30",
  notes: null,
  items: [
    { key: "yogurt", food: "Yogurt greco", quantity: "[quantità]" },
    { key: "avena", food: "Fiocchi d'avena", quantity: "[quantità]" },
    { key: "frutti", food: "Frutti di bosco", quantity: "" },
  ],
};

function Controlled(args: ComponentProps<typeof MealCard>) {
  const [draft, setDraft] = useState<MealPlanDraft>({ notes: "", meals: [args.meal] });
  const meal = draft.meals[0];

  if (meal === undefined) {
    return <p>Pasto tolto.</p>;
  }

  return (
    <div data-reorder-list style={{ width: "min(40rem, 92vw)" }}>
      <MealCard {...args} meal={meal} onDraftChange={setDraft} />
    </div>
  );
}

const meta = {
  title: "Coach/Alimentazione/MealCard",
  component: MealCard,
  tags: ["autodocs"],
  args: {
    meal: breakfast,
    index: 0,
    count: 3,
    name: "Colazione",
    isTagArchived: false,
    tagOptions,
    onDraftChange: () => undefined,
    onMove: () => undefined,
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof MealCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConAlimenti: Story = {};

export const SenzaAlimenti: Story = {
  args: {
    meal: { key: "cena", tagId: 5, timeOfDay: "", notes: null, items: [] },
    name: "Cena",
  },
};

export const TagArchiviato: Story = {
  args: {
    meal: { key: "merenda", tagId: 4, timeOfDay: "", notes: null, items: [] },
    name: "Merenda",
    isTagArchived: true,
    tagOptions: [...tagOptions, { value: "4", label: "Merenda · archiviato" }],
  },
};
