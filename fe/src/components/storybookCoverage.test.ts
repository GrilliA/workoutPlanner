import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const COMPONENTS_DIR = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(COMPONENTS_DIR, "..");

const EXTRA_FOLDERS = [join(SRC_DIR, "pages", "coach", "coachCard")];

function exportedComponents(indexSource: string): string[] {
  const names = new Set<string>();
  const exportBlock = /export\s*\{([^}]+)\}/g;

  for (const match of indexSource.matchAll(exportBlock)) {
    for (const part of match[1].split(",")) {
      const name = part
        .replace(/\bfrom\b.*/, "")
        .replace(/\bas\s+\w+/, "")
        .trim();
      if (name && /^[A-Z]/.test(name)) {
        names.add(name);
      }
    }
  }

  return [...names];
}

function componentFolders(): string[] {
  const shared = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(COMPONENTS_DIR, entry.name));

  return [...shared, ...EXTRA_FOLDERS];
}

describe("Storybook coverage", () => {
  it("documents every public shared component", () => {
    const missing: string[] = [];

    for (const folder of componentFolders()) {
      const indexPath = join(folder, "index.tsx");
      let indexSource: string;
      try {
        indexSource = readFileSync(indexPath, "utf8");
      } catch {
        continue;
      }

      const storiesSource = readdirSync(folder)
        .filter((name) => name.endsWith(".stories.tsx"))
        .map((name) => readFileSync(join(folder, name), "utf8"))
        .join("\n");

      for (const name of exportedComponents(indexSource)) {
        const mentioned = new RegExp(`\\b${name}\\b`).test(storiesSource);
        if (!mentioned) {
          missing.push(`${folder}/${name}`);
        }
      }
    }

    assert.deepEqual(missing, []);
  });
});
