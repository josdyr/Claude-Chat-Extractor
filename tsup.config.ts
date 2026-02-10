import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "claude-chat-extractor": "src/index.ts" },
  format: ["iife"],
  outDir: "dist",
  minify: true,
  bundle: true,
  platform: "browser",
  globalName: "ClaudeChatExtractor",
  outExtension: () => ({ js: ".js" }),
});
