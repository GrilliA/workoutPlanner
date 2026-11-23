import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TemplateDraft } from "../mappers/templateDraft";
import { TemplateEditor } from "./TemplateEditor";

const tag = (id: number, name: string, position: number) => ({
  id,
  name,
  position,
  archivedAt: null,
  planCount: 0,
  templateCount: 0,
});

const liveTags = [tag(1, "Colazione", 0), tag(2, "Spuntino", 1), tag(3, "Pranzo", 2), tag(5, "Cena", 3)];
const names: Record<number, string> = { 1: "Colazione", 2: "Spuntino", 3: "Pranzo", 4: "Merenda", 5: "Cena" };

const standardDay: TemplateDraft = {
  name: "Giornata standard",
  meals: [
    { key: "a", tagId: 1, timeOfDay: "07:30" },
    { key: "b", tagId: 2, timeOfDay: "" },
    { key: "c", tagId: 3, timeOfDay: "13:00" },
    { key: "d", tagId: 4, timeOfDay: "17:00" },
    { key: "e", tagId: 5, timeOfDay: "20:00" },
  ],
};

function Controlled(args: ComponentProps<typeof TemplateEditor>) {
  const [draft, setDraft] = useState(args.draft);

  return (
    <div style={{ width: "min(44rem, 92vw)" }}>
      <TemplateEditor {...args} draft={draft} onDraftChange={(change) => setDraft(change)} />
    </div>
  );
}

const meta = {
  title: "Coach/Alimentazione/TemplateEditor",
  component: TemplateEditor,
  tags: ["autodocs"],
  args: {
    draft: standardDay,
    isNew: false,
    liveTags,
    tagNameOf: (tagId: number) => names[tagId] ?? "Pasto",
    formError: null,
    isSaving: false,
    onDraftChange: () => undefined,
    onSave: () => undefined,
    onDelete: () => undefined,
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof TemplateEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConTagArchiviato: Story = {};

export const Nuovo: Story = {
  args: { draft: { name: "", meals: [] }, isNew: true },
};
