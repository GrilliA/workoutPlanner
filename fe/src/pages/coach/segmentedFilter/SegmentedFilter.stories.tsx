import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedFilter } from "./SegmentedFilter";

type Range = "6m" | "12m";

const options = [
  { value: "6m", label: "6 mesi" },
  { value: "12m", label: "12 mesi" },
] satisfies { value: Range; label: string }[];

function Controlled(args: ComponentProps<typeof SegmentedFilter<Range>>) {
  const [value, setValue] = useState(args.value);

  return <SegmentedFilter {...args} value={value} onChange={setValue} />;
}

const meta = {
  title: "Coach/SegmentedFilter",
  component: SegmentedFilter<Range>,
  tags: ["autodocs"],
  args: { label: "Periodo", options, value: "6m", onChange: () => undefined },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof SegmentedFilter<Range>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondSelected: Story = { args: { value: "12m" } };
