import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { moveItemTo } from "@utils/moveItemTo";
import { ReorderHandle } from "./ReorderHandle";

function ReorderableList({ names }: { names: string[] }) {
  const [order, setOrder] = useState(names);

  return (
    <ol data-reorder-list style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: 0, margin: 0, listStyle: "none", width: "min(22rem, 90vw)" }}>
      {order.map((name, index) => (
        <li
          key={name}
          data-reorder-item
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", borderRadius: "1rem", background: "var(--surface)", boxShadow: "var(--shadow)" }}
        >
          <ReorderHandle
            label={name}
            index={index}
            count={order.length}
            onMove={(fromIndex, toIndex) => setOrder((current) => moveItemTo(current, fromIndex, toIndex))}
          />
          <span style={{ color: "var(--text-h)", fontWeight: 700 }}>{name}</span>
        </li>
      ))}
    </ol>
  );
}

const meta = {
  title: "Coach/ReorderHandle",
  component: ReorderHandle,
  tags: ["autodocs"],
  args: { label: "Colazione", index: 0, count: 3, onMove: () => undefined },
  parameters: {
    docs: {
      description: {
        component:
          "Maniglia di una lista riordinabile: trascina col mouse o col dito, oppure Spazio per prendere, frecce per spostare, Spazio per lasciare, Esc per annullare.",
      },
    },
  },
} satisfies Meta<typeof ReorderHandle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InUnaLista: Story = {
  render: () => <ReorderableList names={["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"]} />,
};

export const DaSola: Story = {
  args: { count: 1 },
};
