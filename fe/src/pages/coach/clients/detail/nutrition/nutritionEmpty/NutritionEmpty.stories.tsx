import type { Meta, StoryObj } from "@storybook/react-vite";
import { NutritionEmpty } from "./NutritionEmpty";

const meta = {
  title: "Coach/Alimentazione/NutritionEmpty",
  component: NutritionEmpty,
  tags: ["autodocs"],
  args: {
    clientName: "[Nome cliente]",
    onCreate: () => undefined,
    onApplyTemplate: () => undefined,
  },
} satisfies Meta<typeof NutritionEmpty>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
