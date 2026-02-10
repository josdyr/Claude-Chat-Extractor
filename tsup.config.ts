import { defineConfig } from "tsup";

export default defineConfig([
  // Console-paste IIFE (existing)
  {
    entry: { "claude-chat-extractor": "src/index.ts" },
    format: ["iife"],
    outDir: "dist",
    minify: true,
    bundle: true,
    platform: "browser",
    globalName: "ClaudeChatExtractor",
    outExtension: () => ({ js: ".js" }),
  },
  // Safari Web Extension content script
  {
    entry: { content: "src/content.ts" },
    format: ["esm"],
    outDir: "web-extension",
    minify: true,
    bundle: true,
    platform: "browser",
    outExtension: () => ({ js: ".js" }),
  },
]);
