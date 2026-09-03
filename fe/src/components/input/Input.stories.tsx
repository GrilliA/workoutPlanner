import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@components/input";

const meta = {
  title: "Componenti/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    error: { control: "text" },
    helper: { control: "text" },
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
    <Input id="story-input" placeholder="Push / Pull / Legs" {...args} />
  ),
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <Input
      id="story-input-label"
      label="Nome scheda"
      placeholder="Push / Pull / Legs"
      {...args}
    />
  ),
};

export const WithError: Story = {
  args: {
    error: "Inserisci un nome valido.",
  },
  render: (args) => (
    <Input
      id="story-input-error"
      label="Nome scheda"
      placeholder="Push / Pull / Legs"
      {...args}
    />
  ),
};

export const Helper: Story = {
  args: {
    helper: "Ultimo carico registrato.",
  },
  render: (args) => (
    <Input
      id="story-input-helper"
      label="Peso"
      type="number"
      placeholder="80"
      {...args}
    />
  ),
};

export const Required: Story = {
  render: (args) => (
    <Input
      id="story-input-required"
      label="Nome scheda"
      placeholder="Push / Pull / Legs"
      required
      {...args}
    />
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <Input
      id="story-input-disabled"
      label="Email"
      defaultValue="coach@example.com"
      readOnly
      {...args}
    />
  ),
};
