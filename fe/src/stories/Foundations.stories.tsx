import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ColorToken = {
  name: string;
  value: string;
};

type ScaleToken = {
  name: string;
  value: string;
};

const COLORS: ColorToken[] = [
  { name: "--accent", value: "#bfdbf7" },
  { name: "--accent-deep", value: "#4a7fb0" },
  { name: "--text-h", value: "#e0e0e0" },
  { name: "--text", value: "#aaaaaa" },
  { name: "--bg", value: "#1d1f25" },
  { name: "--app-bg", value: "#1d1f25" },
  { name: "--border", value: "rgba(224, 224, 224, 0.12)" },
  { name: "--code-bg", value: "#252830" },
  { name: "--surface", value: "#252830" },
  { name: "--surface-elevated", value: "#2c3038" },
  { name: "--accent-bg", value: "rgba(191, 219, 247, 0.12)" },
  { name: "--accent-border", value: "rgba(191, 219, 247, 0.4)" },
  { name: "--on-accent", value: "#111111" },
  { name: "--error", value: "#f87171" },
  { name: "--social-bg", value: "rgba(47, 48, 58, 0.5)" },
  { name: "--hover-bg", value: "rgba(255, 255, 255, 0.06)" },
  { name: "--bottom-nav-bg", value: "rgba(15, 16, 22, 0.96)" },
  { name: "--overlay", value: "rgba(29, 31, 37, 0.4)" },
];

const SPACING: ScaleToken[] = [
  { name: "--space-1", value: "0.25rem" },
  { name: "--space-1-5", value: "0.375rem" },
  { name: "--space-2", value: "0.5rem" },
  { name: "--space-2-5", value: "0.625rem" },
  { name: "--space-3", value: "0.75rem" },
  { name: "--space-4", value: "1rem" },
  { name: "--space-5", value: "1.25rem" },
  { name: "--space-6", value: "1.5rem" },
  { name: "--space-8", value: "2rem" },
];

const RADII: ScaleToken[] = [
  { name: "--radius-sm", value: "0.25rem" },
  { name: "--radius-md", value: "0.375rem" },
  { name: "--radius-lg", value: "0.5rem" },
  { name: "--radius-xl", value: "0.75rem" },
  { name: "--radius-full", value: "999px" },
];

const TYPE_SIZES: ScaleToken[] = [
  { name: "--text-xs", value: "0.8125rem" },
  { name: "--text-sm", value: "0.875rem" },
  { name: "--text-base", value: "1rem" },
  { name: "--text-lg", value: "1.125rem" },
];

const TYPE_FAMILIES: ScaleToken[] = [
  { name: "--sans", value: '"Roboto", system-ui, sans-serif' },
  { name: "--heading", value: '"Roboto", system-ui, sans-serif' },
  { name: "--mono", value: "ui-monospace, Consolas, monospace" },
];

const DURATIONS: ScaleToken[] = [
  { name: "--duration-fast", value: "0.2s" },
  { name: "--duration-spin", value: "0.6s" },
  { name: "--duration-pulse", value: "1.4s" },
];

const Z_INDEX: ScaleToken[] = [
  { name: "--z-overlay", value: "1" },
  { name: "--z-nav", value: "10" },
  { name: "--z-toast", value: "40" },
];

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
  maxWidth: "52rem",
  padding: "1.5rem",
  color: "var(--text)",
  textAlign: "left",
};

const headingStyle: CSSProperties = {
  margin: "0 0 0.75rem",
  color: "var(--text-h)",
  fontSize: "var(--text-lg)",
  fontFamily: "var(--heading)",
};

const captionStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--mono)",
  fontSize: "var(--text-xs)",
  color: "var(--text)",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={headingStyle}>{title}</h2>
      {children}
    </section>
  );
}

function ColorSwatch({ name, value }: ColorToken) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span
        style={{
          width: "2.75rem",
          height: "2.75rem",
          flexShrink: 0,
          borderRadius: "var(--radius-md)",
          background: `var(${name})`,
          border: "1px solid var(--border)",
          boxShadow: name === "--bg" || name === "--app-bg" ? "inset 0 0 0 1px var(--border)" : undefined,
        }}
      />
      <div>
        <p style={{ ...captionStyle, color: "var(--text-h)" }}>{name}</p>
        <p style={captionStyle}>{value}</p>
      </div>
    </div>
  );
}

function SpacingBar({ name, value }: ScaleToken) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "8rem 4.5rem 1fr",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <p style={{ ...captionStyle, color: "var(--text-h)" }}>{name}</p>
      <p style={captionStyle}>{value}</p>
      <span
        style={{
          display: "block",
          height: "0.75rem",
          width: `var(${name})`,
          background: "var(--accent)",
          borderRadius: "var(--radius-sm)",
        }}
      />
    </div>
  );
}

function RadiusSwatch({ name, value }: ScaleToken) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          width: "4rem",
          height: "4rem",
          background: "var(--surface-elevated)",
          border: "1px solid var(--accent-border)",
          borderRadius: `var(${name})`,
        }}
      />
      <p style={{ ...captionStyle, color: "var(--text-h)" }}>{name}</p>
      <p style={captionStyle}>{value}</p>
    </div>
  );
}

function TypeRow({ name, value }: ScaleToken) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: `var(${name})`,
          fontFamily: "var(--sans)",
          color: "var(--text-h)",
          lineHeight: 1.4,
        }}
      >
        Allenamento di oggi
      </p>
      <p style={captionStyle}>
        {name} · {value}
      </p>
    </div>
  );
}

function TokenList({ tokens }: { tokens: ScaleToken[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.5rem" }}>
      {tokens.map((token) => (
        <li key={token.name} style={{ display: "flex", gap: "0.75rem" }}>
          <p style={{ ...captionStyle, color: "var(--text-h)", minWidth: "10rem" }}>
            {token.name}
          </p>
          <p style={captionStyle}>{token.value}</p>
        </li>
      ))}
    </ul>
  );
}

function ColorSection() {
  return (
    <Section title="Colori">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
          gap: "0.75rem",
        }}
      >
        {COLORS.map((token) => (
          <ColorSwatch key={token.name} {...token} />
        ))}
      </div>
    </Section>
  );
}

function SpacingSection() {
  return (
    <Section title="Spaziatura">
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {SPACING.map((token) => (
          <SpacingBar key={token.name} {...token} />
        ))}
      </div>
    </Section>
  );
}

function RadiusSection() {
  return (
    <Section title="Raggi">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
        {RADII.map((token) => (
          <RadiusSwatch key={token.name} {...token} />
        ))}
      </div>
    </Section>
  );
}

function TypeSection() {
  return (
    <Section title="Tipografia">
      <div style={{ display: "grid", gap: "1rem" }}>
        {TYPE_SIZES.map((token) => (
          <TypeRow key={token.name} {...token} />
        ))}
        <TokenList tokens={TYPE_FAMILIES} />
      </div>
    </Section>
  );
}

function ShadowSection() {
  return (
    <Section title="Ombra">
      <div
        style={{
          width: "12rem",
          height: "5rem",
          borderRadius: "var(--radius-xl)",
          background: "var(--surface)",
          boxShadow: "var(--shadow)",
        }}
      />
      <p style={{ ...captionStyle, marginTop: "0.75rem" }}>
        --shadow · rgba(0, 0, 0, 0.45) 0 12px 24px -6px, rgba(0, 0, 0, 0.3) 0 4px
        8px -2px
      </p>
      <p style={{ ...captionStyle, marginTop: "0.35rem" }}>--blur · 12px</p>
    </Section>
  );
}

function DurationSection() {
  return (
    <Section title="Durata">
      <TokenList tokens={DURATIONS} />
    </Section>
  );
}

function ZIndexSection() {
  return (
    <Section title="Z-index">
      <TokenList tokens={Z_INDEX} />
    </Section>
  );
}

const meta = {
  title: "Foundations/Token",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tutti: Story = {
  render: () => (
    <div style={pageStyle}>
      <ColorSection />
      <SpacingSection />
      <RadiusSection />
      <TypeSection />
      <ShadowSection />
      <DurationSection />
      <ZIndexSection />
    </div>
  ),
};

export const Colori: Story = {
  render: () => (
    <div style={pageStyle}>
      <ColorSection />
    </div>
  ),
};

export const Spaziatura: Story = {
  render: () => (
    <div style={pageStyle}>
      <SpacingSection />
    </div>
  ),
};

export const Raggi: Story = {
  render: () => (
    <div style={pageStyle}>
      <RadiusSection />
    </div>
  ),
};

export const Tipografia: Story = {
  render: () => (
    <div style={pageStyle}>
      <TypeSection />
    </div>
  ),
};

export const Ombra: Story = {
  render: () => (
    <div style={pageStyle}>
      <ShadowSection />
    </div>
  ),
};

export const Durata: Story = {
  render: () => (
    <div style={pageStyle}>
      <DurationSection />
    </div>
  ),
};

export const ZIndex: Story = {
  name: "Z-index",
  render: () => (
    <div style={pageStyle}>
      <ZIndexSection />
    </div>
  ),
};
