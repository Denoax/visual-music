import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      headless: process.env.BUMER_HEADFUL !== "1",
      executablePath: process.env.BUMER_CHROME,
      args:
        process.env.BUMER_HEADFUL === "1" || process.env.BUMER_HARDWARE === "1"
          ? [
              "--no-sandbox",
              "--ozone-platform=x11",
              "--use-gl=angle",
              "--use-angle=gl",
            ]
          : ["--no-sandbox", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: "npm run preview -- --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: true,
  },
  reporter: [["list"]],
});
