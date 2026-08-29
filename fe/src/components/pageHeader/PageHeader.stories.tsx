import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@components/button";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Componenti/PageHeader",
  component: PageHeader,
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
  <Button.Root variant="primary">
    <Button.Label>Invita cliente</Button.Label>
  </Button.Root>
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
