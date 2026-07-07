// vite.config.ts — build config for HADŌ (glsl imported as raw strings)
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  assetsInclude: ["**/*.frag", "**/*.vert", "**/*.glsl"],
  build: { target: "es2022" },
});
