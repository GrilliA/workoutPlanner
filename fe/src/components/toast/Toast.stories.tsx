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
        <Button
          variant="primary"
          onClick={() => toast.success("Scheda salvata.")}
        >
          Mostra successo
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.error("Impossibile salvare.")}
        >
          Mostra errore
        </Button>
      </div>
    </>
  ),
} satisfies Meta<typeof ToastHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
