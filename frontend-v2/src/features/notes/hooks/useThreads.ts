import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import type { NoteThread, CreateThreadPayload } from "@/api/notes";
import { NoteThreadArraySchema } from "@/api/schemas";
import { showToast } from "@/lib/toast";
import { isNetworkError, OFFLINE_TOAST_MSG } from "@/lib/networkError";

export const THREADS_KEY = ["channels"] as const;

export function useThreads() {
  return useQuery<NoteThread[]>({
    queryKey: THREADS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<NoteThread[]>("/channels");
      return NoteThreadArraySchema.parse(data) as NoteThread[];
    },
    // Threads update more frequently in chat context — 60s staleTime
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateThreadPayload) =>
      apiClient.post<NoteThread>("/channels", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : "Nepodařilo se vytvořit kanál.",
        isNetworkError(err) ? "info" : "error",
      );
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/channels/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : "Nepodařilo se smazat kanál.",
        isNetworkError(err) ? "info" : "error",
      );
    },
  });
}

/** Mark a thread as read (optimistic — immediately removes unread badge) */
export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string | null) => {
      const id = threadId ?? "main";
      return apiClient.post(`/channels/${encodeURIComponent(id)}/read`).then((r) => r.data);
    },
    onMutate: async (threadId) => {
      await qc.cancelQueries({ queryKey: THREADS_KEY });
      const prev = qc.getQueryData<NoteThread[]>(THREADS_KEY);
      qc.setQueryData<NoteThread[]>(THREADS_KEY, (old) =>
        old?.map((t) =>
          t.id === threadId ? { ...t, hasUnread: false } : t,
        ) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(THREADS_KEY, context.prev);
    },
  });
}
