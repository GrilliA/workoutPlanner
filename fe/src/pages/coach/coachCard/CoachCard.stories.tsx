import { useMemo, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { Button } from "@components/button";
import { CoachCard, CoachCardList } from "./CoachCard";

function CoachCardProviders({ children }: { children: ReactNode }) {
  const { hook } = useMemo(
    () => memoryLocation({ path: "/clients" }),
    [],
  );

  return <Router hook={hook}>{children}</Router>;
}

const meta = {
  title: "Coach/CoachCard",
  component: CoachCard,
  tags: ["autodocs"],
  args: {
    title: "Anna Rossi",
    subtitle: "anna.rossi@example.com",
  },
  decorators: [
    (Story) => (
      <CoachCardProviders>
        <div style={{ width: "22rem" }}>
          <Story />
        </div>
      </CoachCardProviders>
    ),
  ],
} satisfies Meta<typeof CoachCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Nav: Story = {
  args: {
    href: "/clients/1",
    title: "Anna Rossi",
    subtitle: "anna.rossi@example.com",
  },
};

export const Lista: Story = {
  render: () => (
    <CoachCardList>
      <CoachCard
        href="/clients/1"
        title="Anna Rossi"
        subtitle="anna.rossi@example.com"
      />
      <CoachCard
        href="/clients/2"
        title="Luca Bianchi"
        subtitle="luca.bianchi@example.com"
      />
      <CoachCard
        href="/templates/1/edit"
        title="Push / Pull / Legs"
        subtitle="3 · 12 esercizi"
      />
    </CoachCardList>
  ),
};

export const ContenutoCustom: Story = {
  args: {
    title: undefined,
    subtitle: undefined,
  },
  render: () => (
    <CoachCard style={{ textAlign: "center" }}>
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>Codice invito</p>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          margin: "0.5rem 0 1rem",
          color: "var(--text-h)",
        }}
      >
        TRACCIA
      </p>
      <div className="coach-card-actions" style={{ justifyContent: "center" }}>
        <Button type="button" variant="primary">
          Copia codice
        </Button>
        <Button type="button" variant="secondary">
          Rigenera
        </Button>
      </div>
    </CoachCard>
  ),
};
