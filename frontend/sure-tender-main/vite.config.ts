import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { createTanStackStartPlugin } from "@tanstack/start-plugin";

const tanstackStart = createTanStackStartPlugin();

export default defineConfig({
  plugins: [
    tanstackStart,
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  server: {
    port: 8080,
    host: "::"
  }
});
