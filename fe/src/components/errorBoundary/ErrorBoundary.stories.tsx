import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorBoundary } from "@components/errorBoundary";

function ThrowError(): ReactNode {
  throw new Error("Errore di esempio");
}

const meta = {
  title: "Componenti/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p style={{ margin: 0, padding: "2rem", color: "var(--text-h)" }}>
        Contenuto della pagina.
      </p>
    ),
  },
};

export const Fallback: Story = {
  args: {
    children: <ThrowError />,
  },
};
