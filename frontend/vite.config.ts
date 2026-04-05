/**
 * CloudAudit — Vite configuration for the web app.
 *
 * Enables React Router 7 framework mode, Tailwind v4, and TS path aliases.
 * API base URL is not configured here; use VITE_API_URL at build/runtime (see README).
 */
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
