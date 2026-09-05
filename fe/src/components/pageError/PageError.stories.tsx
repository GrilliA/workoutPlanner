import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageError } from "./PageError";

const meta = {
  title: "Componenti/PageError",
  component: PageError,
  tags: ["autodocs"],
} satisfies Meta<typeof PageError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onRetry: () => undefined,
  },
};

export const ConMessaggio: Story = {
  args: {
    message: "Connessione non disponibile",
    onRetry: () => undefined,
  },
};

export const Ricarica: Story = {
  args: {
    title: "Qualcosa è andato storto.",
    message: "Ricarica la pagina per continuare.",
    actionLabel: "Ricarica la pagina",
    onRetry: () => undefined,
  },
};
