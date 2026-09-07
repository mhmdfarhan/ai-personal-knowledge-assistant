export type DocumentStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Knowledge {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  status: DocumentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  total_documents: number;
  total_knowledge: number;
  total_conversations: number;
  total_tokens: number;
  storage_bytes: number;
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  UPLOADING: "Uploading…",
  PROCESSING: "Processing…",
  READY: "Siap",
  FAILED: "Gagal",
};
