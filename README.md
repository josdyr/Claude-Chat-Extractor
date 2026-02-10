# Claude Chat Extractor

Export Claude.ai chat threads as markdown — via Safari extension or browser console.

## Safari Web Extension

```bash
pnpm install && pnpm build

xcrun safari-web-extension-converter web-extension/ \
  --app-name "Claude Chat Extractor" \
  --bundle-identifier dev.josdyr.claude-chat-extractor \
  --macos-only --copy-resources --no-open

xcodebuild -project "Claude Chat Extractor/Claude Chat Extractor.xcodeproj" \
  -scheme "Claude Chat Extractor" build
```

Then enable in **Safari → Settings → Extensions**.

Navigate to any `claude.ai/chat/*` page, click the extension icon, and hit **Export as Markdown**.

## Console Usage

Paste the contents of `dist/claude-chat-extractor.js` into the browser console on a `claude.ai` chat page.

## What Gets Exported

- Full conversation with human/assistant messages
- Thinking blocks (collapsed)
- Artifacts (code blocks with language detection)
- Attachments and file references
- Web search citations
- Conversation metadata (model, date, message count)
