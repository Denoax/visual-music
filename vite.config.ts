import { defineConfig } from "vite";
import { copyFile, mkdir } from "node:fs/promises";
export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      input: { main: "index.html" },
    },
  },
  plugins: [
    {
      name: "private-review-data",
      async closeBundle() {
        await mkdir("dist/analysis", { recursive: true });
        for (const name of ["features.json", "waveform.json", "track.json"])
          await copyFile(`analysis/${name}`, `dist/analysis/${name}`);
      },
    },
  ],
});
