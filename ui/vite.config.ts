import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const port = Number(process.env.UI_PORT) || 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
    host: true,
  },
  preview: { port },
});
