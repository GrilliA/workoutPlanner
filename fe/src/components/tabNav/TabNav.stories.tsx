import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabNav } from "./TabNav";

const meta = {
  title: "Componenti/TabNav",
  component: TabNav,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "36rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TabNav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Impostazioni: Story = {
  args: {
    label: "Sezioni impostazioni",
    items: [
      { label: "Account", href: "/settings" },
      { label: "Listino", href: "/settings/offers" },
    ],
    activeHref: "/settings/offers",
  },
};

const clientTabs = {
  label: "Sezioni cliente",
  items: [
    { label: "Allenamenti", href: "/clients/42" },
    { label: "Abbonamento", href: "/clients/42/subscription" },
  ],
  activeHref: "/clients/42",
};

export const Cliente: Story = {
  args: clientTabs,
};

export const SchermoStretto: Story = {
  args: clientTabs,
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
};
