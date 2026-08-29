import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@components/input";

const meta = {
  title: "Componenti/Input",
  component: Input.Root,
  tags: ["autodocs"],
  argTypes: {
    error: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Input.Root {...args}>
      <Input.Field placeholder="Push / Pull / Legs" />
    </Input.Root>
  ),
} satisfies Meta<typeof Input.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <Input.Root {...args}>
      <Input.Label>Nome scheda</Input.Label>
      <Input.Field placeholder="Push / Pull / Legs" />
    </Input.Root>
  ),
};

export const WithError: Story = {
  args: {
    error: "Inserisci un nome valido.",
  },
  render: (args) => (
    <Input.Root {...args}>
      <Input.Label>Nome scheda</Input.Label>
      <Input.Field placeholder="Push / Pull / Legs" />
      <Input.Error />
    </Input.Root>
  ),
};

export const WithAddon: Story = {
  render: (args) => (
    <Input.Root {...args}>
      <Input.Label>Peso</Input.Label>
      <Input.Control>
        <Input.Field type="number" placeholder="80" />
        <Input.Addon position="end">kg</Input.Addon>
      </Input.Control>
      <Input.Helper>Ultimo carico registrato.</Input.Helper>
    </Input.Root>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <Input.Root {...args}>
      <Input.Label>Email</Input.Label>
      <Input.Field defaultValue="coach@example.com" readOnly />
    </Input.Root>
  ),
};
