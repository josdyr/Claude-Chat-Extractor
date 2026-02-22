import { getOrganizationId, getConversationId, fetchConversation } from "./api";
import { conversationToMarkdown } from "./markdown";
import { downloadMarkdown } from "./download";

interface PageLink {
  title: string;
  url: string;
  /** Text immediately before the link in the DOM, used to locate position in markdown */
  contextBefore: string;
}

/**
 * ⚠️ Scrape external links from the rendered page DOM.
 * The Claude UI enriches artifacts/messages with citation links
 * (e.g., from extended research) that are NOT in the API response.
 * DOM scraping captures these rendered links as a fallback.
 * Also captures surrounding DOM context so we can place inline
 * footnote references at the correct position in the markdown.
 */
function scrapePageLinks(): PageLink[] {
  const links: PageLink[] = [];
  const seen = new Set<string>();

  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="http"][target="_blank"]'
  );

  for (const a of anchors) {
    const url = a.href;
    if (
      seen.has(url) ||
      url.includes("claude.ai") ||
      url.includes("anthropic.com")
    )
      continue;

    seen.add(url);
    const title = a.textContent?.trim() || new URL(url).hostname;

    // Walk up to the nearest block-level parent to get surrounding text
    const parent = a.closest("p, li, td, blockquote, h1, h2, h3, h4, h5, h6");
    const parentText = parent?.textContent || "";
    const linkText = a.textContent || "";
    const linkPos = parentText.indexOf(linkText);

    // Grab ~60 chars before the link as a context anchor for markdown matching
    const contextBefore =
      linkPos > 0
        ? parentText.slice(Math.max(0, linkPos - 60), linkPos).trim()
        : "";

    links.push({ title, url, contextBefore });
  }

  return links;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Insert markdown footnotes [^1] into the text and append definitions.
 * Uses standard markdown footnote syntax (GFM, Obsidian, Typora, etc.)
 * which provides automatic bidirectional navigation.
 */
function insertFootnotes(markdown: string, links: PageLink[]): string {
  if (!links.length) return markdown;

  const insertions: Array<{
    pos: number;
    ref: number;
    title: string;
    titleInText: boolean;
  }> = [];
  const footnotes: Array<{ index: number; title: string; url: string }> = [];
  let refNum = 1;

  for (const link of links) {
    const idx = refNum++;
    footnotes.push({ index: idx, title: link.title, url: link.url });

    // Strategy 1: exact title match — title already in text
    if (link.title.length >= 3) {
      const titleMatch = markdown.match(
        new RegExp(escapeRegex(link.title), "i"),
      );
      if (titleMatch?.index !== undefined) {
        insertions.push({
          pos: titleMatch.index + titleMatch[0].length,
          ref: idx,
          title: link.title,
          titleInText: true,
        });
        continue;
      }
    }

    // Strategy 2: context match — title missing from raw text, inject it
    if (link.contextBefore.length >= 10) {
      const ctx = link.contextBefore.slice(-40);
      const ctxMatch = markdown.match(new RegExp(escapeRegex(ctx), "i"));
      if (ctxMatch?.index !== undefined) {
        insertions.push({
          pos: ctxMatch.index + ctxMatch[0].length,
          ref: idx,
          title: link.title,
          titleInText: false,
        });
        continue;
      }
    }
  }

  // Insert in reverse order to preserve positions
  let result = markdown;
  insertions
    .sort((a, b) => b.pos - a.pos)
    .forEach((ins) => {
      const marker = ins.titleInText
        ? `[^${ins.ref}]`
        : ` ${ins.title}[^${ins.ref}]`;
      result = result.slice(0, ins.pos) + marker + result.slice(ins.pos);
    });

  // Append footnote definitions
  result +=
    "\n\n" +
    footnotes
      .map((f) => `[^${f.index}]: [${f.title}](${f.url})`)
      .join("\n") +
    "\n";

  return result;
}

async function exportChat(): Promise<string> {
  const orgId = getOrganizationId();
  const conversationId = getConversationId();
  const conversation = await fetchConversation(orgId, conversationId);
  const markdown = conversationToMarkdown(conversation);

  // Supplement with links scraped from the rendered page DOM
  const pageLinks = scrapePageLinks();
  const uniqueLinks = pageLinks.filter((l) => !markdown.includes(l.url));
  const fullMarkdown = insertFootnotes(markdown, uniqueLinks);

  downloadMarkdown(fullMarkdown, conversation.name);
  return `Exported "${conversation.name}" (${conversation.chat_messages.length} messages, ${uniqueLinks.length} page links)`;
}

browser.runtime.onMessage.addListener(
  (message: { action: string }, _sender, sendResponse) => {
    if (message.action !== "exportChat") return;

    exportChat()
      .then((result) => sendResponse({ success: true, message: result }))
      .catch((err) =>
        sendResponse({ success: false, message: String(err) })
      );

    return true; // keep message channel open for async response
  }
);
