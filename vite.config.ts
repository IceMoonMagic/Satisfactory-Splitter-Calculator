/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from "vite"
import vue from "@vitejs/plugin-vue"
import { visualizer } from "rollup-plugin-visualizer"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), visualizer() as PluginOption],
  base: "/Satisfactory-Splitter-Calculator/",
  build: {
    rollupOptions: {
      output: {
        // Put everything that's just from `vue-mermaid-string` into a folder
        chunkFileNames: (chunkInfo) => {
          return chunkInfo.moduleIds.reduce(
            (p, c) => p || c.indexOf("vue-mermaid-string") != -1,
            false,
          )
            ? "mermaid/[name]-[hash].js"
            : "[name]-[hash].js"
        },
      },
    },
  },
  // @ts-ignore
  test: {
    includeSource: ["src/**/*.{js,ts}"],
  },
  define: {
    "import.meta.vitest": "undefined",
  },
})
