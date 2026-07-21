import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@api": path.resolve(__dirname, "./src/api"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@dashboard": path.resolve(__dirname, "./src/pages/home/dashboard"),
      "@dashboard/*": path.resolve(__dirname, "./src/pages/home/dashboard/*"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@pages/*": path.resolve(__dirname, "./src/pages/*"),
      "@auth": path.resolve(__dirname, "./src/auth"),
      "@auth/*": path.resolve(__dirname, "./src/auth/*"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
      },
    },
  },
});
