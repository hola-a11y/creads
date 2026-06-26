import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev` the /api functions are not running (those are Vercel
// serverless functions). The app falls back to localStorage automatically,
// so local dev still works for UI. Use `vercel dev` to test the API locally.
export default defineConfig({
  plugins: [react()],
});
