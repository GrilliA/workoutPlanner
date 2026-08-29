import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@components/button";
import { ToastHost, toast } from "@components/toast";

const meta = {
  title: "Componenti/Toast",
  component: ToastHost,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  render: () => (
    <>
      <ToastHost />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Button.Root
          variant="primary"
          onClick={() => toast.success("Scheda salvata.")}
        >
          <Button.Label>Mostra successo</Button.Label>
        </Button.Root>
        <Button.Root
          variant="secondary"
          onClick={() => toast.error("Impossibile salvare.")}
        >
          <Button.Label>Mostra errore</Button.Label>
        </Button.Root>
      </div>
    </>
  ),
} satisfies Meta<typeof ToastHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
