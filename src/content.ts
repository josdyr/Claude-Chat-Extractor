import { getOrganizationId, getConversationId, fetchConversation } from "./api";
import { conversationToMarkdown } from "./markdown";
import { downloadMarkdown } from "./download";

async function exportChat(): Promise<string> {
  const orgId = getOrganizationId();
  const conversationId = getConversationId();
  const conversation = await fetchConversation(orgId, conversationId);
  const markdown = conversationToMarkdown(conversation);
  downloadMarkdown(markdown, conversation.name);
  return `Exported "${conversation.name}" (${conversation.chat_messages.length} messages)`;
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
