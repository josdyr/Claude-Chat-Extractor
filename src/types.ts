// Claude.ai internal API response types

export interface Conversation {
  uuid: string;
  name: string;
  summary?: string;
  model?: string | null;
  created_at: string;
  updated_at: string;
  current_leaf_message_uuid?: string;
  chat_messages: ChatMessage[];
  settings?: ConversationSettings;
}

export interface ConversationSettings {
  preview_feature_uses_artifacts?: boolean;
  preview_feature_uses_latex?: boolean;
  preview_feature_uses_citations?: boolean;
  enabled_artifacts_attachments?: boolean;
}

export interface ChatMessage {
  uuid: string;
  index: number;
  sender: "human" | "assistant";
  text?: string;
  content: ContentBlock[];
  created_at: string;
  updated_at: string;
  truncated?: boolean;
  parent_message_uuid?: string;
  attachments?: Attachment[];
  files?: FileRef[];
  files_v2?: FileRef[];
}

// Discriminated union for content blocks
export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ServerToolUseBlock
  | WebSearchToolResultBlock;

export interface TextBlock {
  type: "text";
  text: string;
  citations?: Citation[];
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
  summaries?: unknown[];
}

export interface ToolUseBlock {
  type: "tool_use";
  id?: string;
  name: string;
  input: ArtifactInput | Record<string, unknown>;
  display_content?: DisplayContent | null;
}

export interface ArtifactInput {
  id?: string;
  type?: string;
  title?: string;
  command?: string;
  content?: string;
  language?: string | null;
  version_uuid?: string;
}

export interface DisplayContent {
  type: "code_block" | "json_block";
  code?: string;
  language?: string;
  filename?: string;
}

export interface ToolResultBlock {
  type: "tool_result";
  name?: string;
  content: Array<{ type?: string; text?: string }>;
  is_error?: boolean;
}

export interface ServerToolUseBlock {
  type: "server_tool_use";
  id?: string;
  name: string;
  input: { query?: string } & Record<string, unknown>;
}

export interface WebSearchToolResultBlock {
  type: "web_search_tool_result";
  tool_use_id?: string;
  content: WebSearchResult[] | WebSearchError;
}

export interface WebSearchResult {
  type: "web_search_result";
  url: string;
  title: string;
  page_age?: string;
  encrypted_content?: string;
}

export interface WebSearchError {
  type: "web_search_tool_result_error";
  error_code: string;
}

export interface Citation {
  type: string;
  url?: string;
  title?: string;
  cited_text?: string;
}

export interface Attachment {
  id?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  extracted_content?: string;
}

export interface FileRef {
  file_kind?: string;
  file_uuid?: string;
  file_name?: string;
  created_at?: string;
}
