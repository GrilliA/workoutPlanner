import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";

const meta = {
  title: "Componenti/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  args: {
    isOpen: false,
    title: "Uscire senza salvare?",
    message: "Le modifiche alla scheda andranno perse.",
    confirmLabel: "Esci senza salvare",
    cancelLabel: "Resta",
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
  render: function Render(args) {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Apri conferma
        </Button>
        <ConfirmDialog
          {...args}
          isOpen={isOpen}
          onConfirm={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UscitaSenzaSalvare: Story = {};

export const SostituisciScheda: Story = {
  args: {
    title: "Sostituire la scheda?",
    message: "Il TXT sostituisce nome, giorni ed esercizi della scheda attuale.",
    confirmLabel: "Sostituisci",
    cancelLabel: "Annulla",
  },
};
