import type {
  Conversation,
  ChatMessage,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
  WebSearchToolResultBlock,
  WebSearchResult,
  ArtifactInput,
  Citation,
  Attachment,
} from "./types";

export function conversationToMarkdown(conversation: Conversation): string {
  const messages = resolveMessageBranch(conversation);
  const lines: string[] = [];

  // Header
  lines.push(`# ${conversation.name || "Untitled Conversation"}`);
  lines.push("");
  lines.push(`> Exported on ${new Date().toISOString().split("T")[0]} from Claude.ai`);
  lines.push(`> Model: ${conversation.model || "unknown"} | Messages: ${messages.length}`);
  lines.push(`> URL: ${window.location.href}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const msg of messages) {
    lines.push(renderMessage(msg));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** Resolve the active message branch using parent_message_uuid chain */
function resolveMessageBranch(conversation: Conversation): ChatMessage[] {
  const messages = conversation.chat_messages;
  if (!messages?.length) return [];

  const leafId = conversation.current_leaf_message_uuid;
  if (!leafId) return messages; // No branching info, return all

  // Build lookup
  const byId = new Map<string, ChatMessage>();
  for (const m of messages) byId.set(m.uuid, m);

  // Walk from leaf to root
  const branch: ChatMessage[] = [];
  let current = byId.get(leafId);
  while (current) {
    branch.unshift(current);
    current = current.parent_message_uuid
      ? byId.get(current.parent_message_uuid)
      : undefined;
  }

  return branch.length > 0 ? branch : messages;
}

function renderMessage(msg: ChatMessage): string {
  const parts: string[] = [];
  const sender = msg.sender === "human" ? "Human" : "Assistant";
  parts.push(`## ${sender}`);
  parts.push("");

  // Attachments (human messages)
  if (msg.attachments?.length) {
    parts.push(renderAttachments(msg.attachments));
  }

  // Content blocks
  const artifacts: string[] = [];
  const sources = new Map<string, { title: string; url: string }>();

  for (const block of msg.content) {
    const rendered = renderContentBlock(block, artifacts, sources);
    if (rendered) parts.push(rendered);
  }

  // Legacy: inline text field (older conversations)
  if (!msg.content?.length && msg.text) {
    parts.push(msg.text);
  }

  // Collected artifacts
  if (artifacts.length) {
    parts.push("");
    parts.push("### Artifacts");
    parts.push("");
    parts.push(artifacts.join("\n\n"));
  }

  // Collected sources
  if (sources.size) {
    parts.push("");
    parts.push("### Sources");
    parts.push("");
    for (const [, src] of sources) {
      parts.push(`- [${src.title}](${src.url})`);
    }
  }

  return parts.join("\n");
}

function renderContentBlock(
  block: ContentBlock,
  artifacts: string[],
  sources: Map<string, { title: string; url: string }>,
): string {
  switch (block.type) {
    case "text":
      return renderTextBlock(block, sources);
    case "thinking":
      return renderThinkingBlock(block);
    case "tool_use":
      return renderToolUseBlock(block, artifacts);
    case "tool_result":
      return renderToolResultBlock(block);
    case "web_search_tool_result":
      return renderWebSearchResults(block, sources);
    case "server_tool_use":
      return ""; // Search query initiation — skip, results captured elsewhere
    default:
      return "";
  }
}

function renderTextBlock(
  block: TextBlock,
  sources: Map<string, { title: string; url: string }>,
): string {
  // Collect citations
  if (block.citations?.length) {
    for (const c of block.citations) {
      collectCitation(c, sources);
    }
  }
  return block.text;
}

function renderThinkingBlock(block: ThinkingBlock): string {
  if (!block.thinking) return "";
  return [
    "<details>",
    "<summary>Thinking</summary>",
    "",
    block.thinking,
    "",
    "</details>",
    "",
  ].join("\n");
}

function renderToolUseBlock(block: ToolUseBlock, artifacts: string[]): string {
  if (block.name === "artifacts") {
    return renderArtifact(block, artifacts);
  }

  // Generic tool use (research, analysis, etc.)
  const input = block.input as Record<string, unknown>;
  const name = block.name || "tool";
  const summary = input.query || input.title || input.command || "";

  if (!summary) return "";

  return [
    "<details>",
    `<summary>Tool: ${name}</summary>`,
    "",
    `\`\`\`json`,
    JSON.stringify(input, null, 2),
    `\`\`\``,
    "",
    "</details>",
    "",
  ].join("\n");
}

function renderArtifact(block: ToolUseBlock, artifacts: string[]): string {
  const input = block.input as ArtifactInput;
  const display = block.display_content;

  const title = input.title || "Artifact";
  const content = display?.code || input.content || "";
  const lang = display?.language || input.language || inferLanguage(input.type);
  const filename = display?.filename || "";

  if (!content) return "";

  const header = filename ? `**${title}** (\`${filename}\`)` : `**${title}**`;

  if (isCodeType(input.type)) {
    artifacts.push(`${header}\n\n\`\`\`${lang}\n${content}\n\`\`\``);
  } else {
    // Document/text artifact
    artifacts.push(`${header}\n\n${content}`);
  }

  return ""; // Artifacts rendered in collected section
}

function renderToolResultBlock(block: ToolResultBlock): string {
  if (!block.content?.length) return "";

  const texts = block.content
    .filter((c) => c.text)
    .map((c) => c.text!);

  if (!texts.length) return "";

  if (block.is_error) {
    return `> **Error**: ${texts.join("\n")}`;
  }

  return texts.join("\n");
}

function renderWebSearchResults(
  block: WebSearchToolResultBlock,
  sources: Map<string, { title: string; url: string }>,
): string {
  if (!Array.isArray(block.content)) return "";

  for (const result of block.content as WebSearchResult[]) {
    if (result.url && result.title) {
      sources.set(result.url, { title: result.title, url: result.url });
    }
  }

  return ""; // Sources rendered in collected section
}

function renderAttachments(attachments: Attachment[]): string {
  const parts: string[] = ["### Attachments", ""];

  for (const att of attachments) {
    const name = att.file_name || "file";
    const size = att.file_size ? ` (${formatBytes(att.file_size)})` : "";
    parts.push(`- **${name}**${size}${att.file_type ? ` — \`${att.file_type}\`` : ""}`);

    if (att.extracted_content) {
      parts.push("");
      parts.push("<details>");
      parts.push(`<summary>${name} content</summary>`);
      parts.push("");
      parts.push(att.extracted_content);
      parts.push("");
      parts.push("</details>");
      parts.push("");
    }
  }

  return parts.join("\n");
}

function collectCitation(
  c: Citation,
  sources: Map<string, { title: string; url: string }>,
): void {
  if (c.url && c.title) {
    sources.set(c.url, { title: c.title, url: c.url });
  }
}

function inferLanguage(type?: string): string {
  if (!type) return "";
  const map: Record<string, string> = {
    "application/vnd.ant.code": "",
    "application/vnd.ant.react": "tsx",
    "application/vnd.ant.mermaid": "mermaid",
    "text/html": "html",
    "text/css": "css",
    "text/markdown": "markdown",
    "image/svg+xml": "svg",
  };
  return map[type] ?? "";
}

function isCodeType(type?: string): boolean {
  if (!type) return false;
  return (
    type.startsWith("application/vnd.ant.") ||
    type === "text/html" ||
    type === "text/css" ||
    type === "image/svg+xml"
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
