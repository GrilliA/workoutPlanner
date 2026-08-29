import type { Preview } from "@storybook/react-vite";

import "../src/index.css";
import "../src/styles/layout.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      options: {
        dark: { name: "Dark", value: "#1d1f25" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "dark" },
  },
};

export default preview;
