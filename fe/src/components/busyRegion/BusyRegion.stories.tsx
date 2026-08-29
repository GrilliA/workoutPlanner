import type { Meta, StoryObj } from "@storybook/react-vite";
import { BusyRegion } from "@components/busyRegion";

function SampleContent() {
  return (
    <div
      style={{
        minHeight: "8rem",
        padding: "1.5rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--surface)",
      }}
    >
      <p style={{ margin: 0, color: "var(--text-h)" }}>Allenamento di oggi</p>
      <p style={{ margin: "0.35rem 0 0", color: "var(--text)" }}>
        4 esercizi · 45 min
      </p>
    </div>
  );
}

const meta = {
  title: "Componenti/BusyRegion",
  component: BusyRegion,
  tags: ["autodocs"],
  argTypes: {
    busy: { control: "boolean" },
    label: { control: "text" },
  },
  args: {
    busy: false,
    label: "Caricamento…",
    children: <SampleContent />,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <BusyRegion {...args}>
      <SampleContent />
    </BusyRegion>
  ),
} satisfies Meta<typeof BusyRegion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    busy: false,
  },
};

export const Busy: Story = {
  args: {
    busy: true,
  },
};

export const CustomLabel: Story = {
  args: {
    busy: true,
    label: "Salvataggio…",
  },
};
