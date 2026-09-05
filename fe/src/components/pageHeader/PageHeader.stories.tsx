import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@components/button";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Componenti/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "36rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

const inviteAction = (
  <Button variant="primary">Invita cliente</Button>
);

export const Default: Story = {
  args: {
    title: "Clienti",
    subtitle: "Atleti collegati al tuo account",
    action: inviteAction,
  },
};

export const SenzaAction: Story = {
  args: {
    title: "Clienti",
    subtitle: "Atleti collegati al tuo account",
  },
};

export const SenzaSubtitle: Story = {
  args: {
    title: "Clienti",
    action: inviteAction,
  },
};
