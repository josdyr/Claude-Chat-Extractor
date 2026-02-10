import type { Conversation } from "./types";

export function getOrganizationId(): string {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("lastActiveOrg="));

  if (match) {
    const value = match.split("=")[1];
    if (isUUID(value)) return value;
  }

  // Fallback: check Next.js hydration data
  const w = window as unknown as Record<string, unknown>;
  const nextData = w.__NEXT_DATA__ as { props?: { pageProps?: { organization?: { uuid?: string } } } } | undefined;
  const orgId = nextData?.props?.pageProps?.organization?.uuid;
  if (orgId && isUUID(orgId)) return orgId;

  throw new Error("Could not find organization ID. Are you on claude.ai?");
}

export function getConversationId(): string {
  const path = window.location.pathname;
  const match = path.match(/\/chat\/([a-f0-9-]{36})/);
  if (!match) {
    throw new Error("Could not find conversation ID. Navigate to a chat page first.");
  }
  return match[1];
}

export async function fetchConversation(orgId: string, conversationId: string): Promise<Conversation> {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`;

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
