import { useMemo, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AuthContext, type AuthContextValue } from "@auth/useAuth";
import { AppShell } from "@components/appShell";

function AppShellProviders({ children }: { children: ReactNode }) {
  const { hook } = useMemo(
    () => memoryLocation({ path: "/dashboard" }),
    [],
  );

  const auth = useMemo<AuthContextValue>(
    () => ({
      status: "authenticated",
      user: {
        id: 1,
        email: "anna.rossi@example.com",
        name: "Anna Rossi",
        role: "coach",
      },
      login: async () => undefined,
      register: async () => undefined,
      logout: async () => undefined,
      setUser: () => undefined,
      retryBootstrap: () => undefined,
    }),
    [],
  );

  return (
    <Router hook={hook}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </Router>
  );
}

function FakePage() {
  return (
    <div>
      <h1 style={{ margin: 0, color: "var(--text-h)", fontSize: "1.25rem" }}>
        Dashboard
      </h1>
      <p style={{ margin: "0.5rem 0 0", color: "var(--text)" }}>
        Contenuto di esempio nel guscio.
      </p>
    </div>
  );
}

const meta = {
  title: "Componenti/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    hideBottomNav: { control: "boolean" },
  },
  args: {
    hideBottomNav: false,
    children: <FakePage />,
  },
  decorators: [
    (Story) => (
      <AppShellProviders>
        <Story />
      </AppShellProviders>
    ),
  ],
  render: (args) => (
    <AppShell {...args}>
      <FakePage />
    </AppShell>
  ),
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HideBottomNav: Story = {
  args: {
    hideBottomNav: true,
  },
};
