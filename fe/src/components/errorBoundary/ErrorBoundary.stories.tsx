import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApiError } from "@api";
import { ErrorBoundary } from "@components/errorBoundary";

function ThrowError(): ReactNode {
  throw new Error("Cannot read properties of undefined");
}

function ThrowApiError(): ReactNode {
  throw new ApiError(0, "Connessione non disponibile");
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

export const FallbackLoad: Story = {
  args: {
    children: <ThrowApiError />,
  },
};
