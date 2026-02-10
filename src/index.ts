import { getOrganizationId, getConversationId, fetchConversation } from "./api";
import { conversationToMarkdown } from "./markdown";
import { downloadMarkdown } from "./download";

(async () => {
  try {
    console.log("[Claude Chat Extractor] Starting...");

    const orgId = getOrganizationId();
    const conversationId = getConversationId();
    console.log(`[Claude Chat Extractor] Org: ${orgId}, Chat: ${conversationId}`);

    const conversation = await fetchConversation(orgId, conversationId);
    console.log(`[Claude Chat Extractor] Fetched: "${conversation.name}" (${conversation.chat_messages.length} messages)`);

    const markdown = conversationToMarkdown(conversation);
    downloadMarkdown(markdown, conversation.name);

    console.log("[Claude Chat Extractor] Download triggered!");
  } catch (err) {
    console.error("[Claude Chat Extractor] Error:", err);
  }
})();
