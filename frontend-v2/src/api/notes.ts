// Types for the Notes / Chat module

export interface NoteReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface NoteReplyTo {
  id: string;
  message: string;
  username: string;
}

export interface Note {
  id: string;
  userId: string;
  username: string;
  message: string;
  threadId: string | null; // null = "Hlavní" thread
  createdAt: string;
  isResolvedAsTask?: boolean;
  editedAt?: string | null;
  isPinned?: boolean;
  replyToId?: string | null;
  replyTo?: NoteReplyTo | null;
  reactions?: NoteReaction[];
}

export interface NoteThread {
  id: string | null;
  name: string;
  createdById: string | null;
  createdAt: string | null;
  messageCount?: number;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageBy?: string | null;
  hasUnread?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  items?: { purchased: boolean }[];
}

export interface SendNotePayload {
  message: string;
  threadId: string | null;
  replyToId?: string | null;
}

export interface CreateThreadPayload {
  name: string;
}
