import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import type { Note, SendNotePayload } from "@/api/notes";
import { NoteArraySchema } from "@/api/schemas";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";
import { isNetworkError, OFFLINE_TOAST_MSG } from "@/lib/networkError";
import { THREADS_KEY } from "./useThreads";
import { useMemo } from "react";

/** Query key for a specific channel's messages */
export function threadNotesKey(threadId: string | null) {
  return ["channels", threadId ?? "__main__"] as const;
}

interface PaginatedResponse {
  messages: Note[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Fetch messages for a channel with cursor-based pagination.
 * Returns flattened Note[] + pagination helpers.
 */
export function useThreadNotes(threadId: string | null) {
  const query = useInfiniteQuery<PaginatedResponse>({
    queryKey: threadNotesKey(threadId),
    queryFn: async ({ pageParam }) => {
      const url =
        threadId === null
          ? `/channels/messages`
          : `/channels/${encodeURIComponent(threadId)}/messages`;
      const params: Record<string, string> = { limit: "50" };
      if (pageParam) params.cursor = pageParam as string;
      const { data } = await apiClient.get<PaginatedResponse>(url, { params });
      // Validate the messages array
      NoteArraySchema.parse(data.messages);
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 3 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Flatten pages into a single sorted array
  const data = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((p) => p.messages).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [query.data?.pages]);

  return {
    data,
    isLoading: query.isLoading,
    hasMore: query.hasNextPage ?? false,
    isFetchingMore: query.isFetchingNextPage,
    fetchMore: query.fetchNextPage,
  };
}

/** Send a new note — uses Optimistic UI update */
export function useSendNote() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: SendNotePayload) => {
      const url =
        payload.threadId === null
          ? `/channels/messages`
          : `/channels/${encodeURIComponent(payload.threadId)}/messages`;
      return apiClient.post<Note>(url, payload).then((r) => r.data);
    },

    // Optimistic update — append to last page
    onMutate: async (payload) => {
      const key = threadNotesKey(payload.threadId);
      await qc.cancelQueries({ queryKey: key });
      const previousData = qc.getQueryData(key);

      const optimistic: Note = {
        id: `optimistic-${Date.now()}`,
        userId: user?.userId ?? "",
        username: user?.username ?? "",
        message: payload.message,
        threadId: payload.threadId,
        createdAt: new Date().toISOString(),
        isResolvedAsTask: false,
        editedAt: null,
        isPinned: false,
        replyToId: payload.replyToId ?? null,
        replyTo: null,
        reactions: [],
      };

      qc.setQueryData(key, (old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined) => {
        if (!old?.pages?.length) {
          return { pages: [{ messages: [optimistic], nextCursor: null, hasMore: false }], pageParams: [undefined] };
        }
        const pages = [...old.pages];
        const lastPage = pages[pages.length - 1];
        pages[pages.length - 1] = { ...lastPage, messages: [...lastPage.messages, optimistic] };
        return { ...old, pages };
      });

      return { previousData, key };
    },

    onError: (_err, _vars, context) => {
      if (isNetworkError(_err)) {
        showToast(OFFLINE_TOAST_MSG, "info");
        return;
      }
      if (context?.previousData !== undefined) {
        qc.setQueryData(context.key, context.previousData);
      }
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: threadNotesKey(vars.threadId) });
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

// Helper to update a note in the infinite query cache
function updateNoteInCache(
  old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined,
  noteId: string,
  updater: (note: Note) => Note,
) {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages.map((n) => (n.id === noteId ? updater(n) : n)),
    })),
  };
}

// Helper to remove a note from the infinite query cache
function removeNoteFromCache(
  old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined,
  noteId: string,
) {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages.filter((n) => n.id !== noteId),
    })),
  };
}

/** Delete a message */
export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; threadId: string | null }) =>
      apiClient.delete(`/messages/${id}`),

    onMutate: async ({ id, threadId }) => {
      const key = threadNotesKey(threadId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined) =>
        removeNoteFromCache(old, id),
      );
      return { prev, key };
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
      showToast("Zprávu se nepodařilo smazat.", "error");
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: threadNotesKey(vars.threadId) });
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

/** Mark a message as resolved (converted to task) */
export function useResolveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/messages/${id}/resolve`).then((r) => r.data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

/** Edit a message (own messages only, within 15 min) */
export function useEditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string; threadId: string | null }) =>
      apiClient
        .patch<{ id: string; message: string; editedAt: string | null }>(`/messages/${id}`, { message })
        .then((r) => r.data),

    onMutate: async ({ id, message, threadId }) => {
      const key = threadNotesKey(threadId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined) =>
        updateNoteInCache(old, id, (n) => ({ ...n, message, editedAt: new Date().toISOString() })),
      );
      return { prev, key };
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
      if (isNetworkError(_err)) {
        showToast(OFFLINE_TOAST_MSG, "info");
      } else {
        const msg = (_err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast(msg || "Nepodařilo se upravit zprávu.", "error");
      }
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: threadNotesKey(vars.threadId) });
    },
  });
}

/** Toggle pin on a message */
export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; threadId: string | null }) =>
      apiClient.patch<{ id: string; isPinned: boolean }>(`/messages/${id}/pin`).then((r) => r.data),

    onMutate: async ({ id, threadId }) => {
      const key = threadNotesKey(threadId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined) =>
        updateNoteInCache(old, id, (n) => ({ ...n, isPinned: !n.isPinned })),
      );
      return { prev, key };
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
      showToast("Nepodařilo se připnout zprávu.", "error");
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: threadNotesKey(vars.threadId) });
    },
  });
}

/** Toggle a reaction on a note (optimistic) */
export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string; threadId: string | null }) =>
      apiClient
        .post<{ action: "added" | "removed"; emoji: string }>(`/messages/${id}/reactions`, { emoji })
        .then((r) => r.data),

    onMutate: async ({ id, emoji, threadId }) => {
      const key = threadNotesKey(threadId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: { pages: PaginatedResponse[]; pageParams: unknown[] } | undefined) =>
        updateNoteInCache(old, id, (n) => {
          const reactions = [...(n.reactions ?? [])];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (idx >= 0) {
            const r = reactions[idx];
            if (r.reacted) {
              if (r.count <= 1) {
                reactions.splice(idx, 1);
              } else {
                reactions[idx] = { ...r, count: r.count - 1, reacted: false };
              }
            } else {
              reactions[idx] = { ...r, count: r.count + 1, reacted: true };
            }
          } else {
            reactions.push({ emoji, count: 1, reacted: true });
          }
          return { ...n, reactions };
        }),
      );
      return { prev, key };
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: threadNotesKey(vars.threadId) });
    },
  });
}