/**
 * NotesPage.tsx — Fáze 4: 1:1 port pages/notes.ts
 *
 * Master-detail layout:
 *   Mobile  → buď ThreadList NEBO ChatView (přepínání)
 *   Desktop → ThreadList vlevo, ChatView vpravo
 */
import { useState, useEffect, useMemo } from "react";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from "@tanstack/react-query";
import { useThreads, useCreateThread, useDeleteThread, useMarkThreadRead } from "./hooks/useThreads";
import { useThreadNotes } from "./hooks/useNotes";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ThreadList } from "./ThreadList";
import { ChatView } from "./ChatView";
import { MessageInput } from "./MessageInput";
import { AddToShoppingDialog } from "./AddToShoppingDialog";
import { CreateRepairDialog } from "./CreateRepairDialog";
import type { Note } from "@/api/notes";
import { showToast } from "@/lib/toast";
import apiClient from "@/api/client";
import { PromptDialog } from "@/components/shared/PromptDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface Users {
  username: string;
  color?: string;
  animalIcon?: string | null;
}

export function NotesPage() {
  useDocumentTitle('Chat');
  const { data: threads = [], isLoading: threadsLoading } = useThreads();
  const createThread = useCreateThread();
  const deleteThread = useDeleteThread();
  const markRead = useMarkThreadRead();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const { data: threadNotes, isLoading: notesLoading, hasMore, isFetchingMore, fetchMore } = useThreadNotes(activeThreadId);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Context dialogs
  const [shoppingNote, setShoppingNote] = useState<Note | null>(null);
  const [repairNote, setRepairNote] = useState<Note | null>(null);
  const [showNewThreadPrompt, setShowNewThreadPrompt] = useState(false);
  const [replyToNote, setReplyToNote] = useState<Note | null>(null);
  const [showDeleteThread, setShowDeleteThread] = useState(false);

  // User color/icon map — cachováno React Query (30 min), ne useEffect bez cache
  const { data: rawUsers = [] } = useQuery<Users[]>({
    queryKey: ["users-list"],
    queryFn: () => apiClient.get<Users[]>("/users").then((r) => r.data),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const userMap = useMemo(() => {
    const map: Record<string, { color?: string; animalIcon?: string | null }> = {};
    for (const u of rawUsers) {
      map[u.username] = { color: u.color, animalIcon: u.animalIcon };
    }
    return map;
  }, [rawUsers]);

  // Navigate to thread requested from another page (e.g. shopping share)
  useEffect(() => {
    const gotoThread = sessionStorage.getItem("notes_goto_thread");
    if (gotoThread !== null) {
      sessionStorage.removeItem("notes_goto_thread");
      const id = gotoThread === "__main__" ? null : gotoThread;
      setActiveThreadId(id);
      if (isMobile) setMobileShowChat(true);
    }
  }, [isMobile]);

  // Active thread name
  const activeThreadName = useMemo(() => {
    if (activeThreadId === null) return "Hlavní";
    return threads.find((t) => t.id === activeThreadId)?.name ?? "—";
  }, [activeThreadId, threads]);

  const handleSelectThread = (id: string | null) => {
    setActiveThreadId(id);
    setReplyToNote(null);
    if (isMobile) setMobileShowChat(true);
    // Mark as read (fire-and-forget, optimistic UI update)
    markRead.mutate(id);
  };

  const handleCreateThread = async () => {
    setShowNewThreadPrompt(true);
  };

  const handleCreateThreadSubmit = async (name: string) => {
    if (name.length > 100) {
      showToast("Název tématu je příliš dlouhý (max 100 znaků).", "error");
      return;
    }
    try {
      const res = await createThread.mutateAsync({ name });
      setActiveThreadId(res.id);
      if (isMobile) setMobileShowChat(true);
      setShowNewThreadPrompt(false);
    } catch {
      showToast("Nepodařilo se vytvořit téma.", "error");
    }
  };

  const handleDeleteThread = () => setShowDeleteThread(true);
  const confirmDeleteThread = async () => {
    if (!activeThreadId) return;
    try {
      await deleteThread.mutateAsync(activeThreadId);
      setActiveThreadId(null);
      setShowDeleteThread(false);
      showToast("Téma bylo smazáno.", "success");
    } catch {
      showToast("Nepodařilo se smazat téma.", "error");
    }
  };

  const handleBackToList = () => setMobileShowChat(false);

  // ── Render ──────────────────────────────────────────────────────
  const showSidebar = !isMobile || !mobileShowChat;
  const showChat = !isMobile || mobileShowChat;

  return (
    <>
      <div className="notes-layout">

          {/* ── Left: ThreadList ── */}
          {showSidebar && (
            threadsLoading ? (
              <aside className="notes-sidebar">
                <div className="notes-search" style={{ padding: '1rem' }}>
                  <div className="skeleton skeleton-text long"></div>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-list-item" style={{ padding: '0.75rem 1rem' }}>
                    <div className="skeleton skeleton-avatar"></div>
                    <div className="skeleton-list-text">
                      <div className="skeleton skeleton-text medium" style={{ marginBottom: 4 }}></div>
                      <div className="skeleton skeleton-text short"></div>
                    </div>
                  </div>
                ))}
              </aside>
            ) : (
              <ThreadList
                threads={threads}
                activeThreadId={activeThreadId}
                searchQuery={searchQuery}
                userMap={userMap}
                onSearchChange={setSearchQuery}
                onSelectThread={handleSelectThread}
                onCreateThread={handleCreateThread}
              />
            )
          )}

          {/* ── Right: Chat area ── */}
          {showChat && (
            <div className="notes-chat-area-wrapper">
              {/* Mobile back button */}
              {isMobile && mobileShowChat && (
                <button
                  className="button-icon mobile-chat-back"
                  aria-label="Zpět na seznam"
                  onClick={handleBackToList}
                >
                  ← Zpět
                </button>
              )}
              {notesLoading ? (
                <div className="notes-messages" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {i % 2 !== 0 && <div className="skeleton skeleton-avatar-sm" style={{ marginRight: 8, flexShrink: 0 }}></div>}
                      <div className="skeleton skeleton-text" style={{ width: `${40 + (i * 7) % 30}%`, height: 38, borderRadius: 12 }}></div>
                      {i % 2 === 0 && <div className="skeleton skeleton-avatar-sm" style={{ marginLeft: 8, flexShrink: 0 }}></div>}
                    </div>
                  ))}
                </div>
              ) : (
                <ChatView
                  notes={threadNotes}
                  activeThreadId={activeThreadId}
                  activeThreadName={activeThreadName}
                  userMap={userMap}
                  hasMore={hasMore}
                  isFetchingMore={isFetchingMore}
                  onFetchMore={fetchMore}
                  onAddToShopping={setShoppingNote}
                  onCreateRepair={setRepairNote}
                  onReply={setReplyToNote}
                  onDeleteThread={handleDeleteThread}
                />
              )}
              <MessageInput
                activeThreadId={activeThreadId}
                replyTo={replyToNote}
                onCancelReply={() => setReplyToNote(null)}
              />
            </div>
          )}

      </div>

      {/* ── Dialogs ── */}
      <AddToShoppingDialog
        open={!!shoppingNote}
        noteId={shoppingNote?.id ?? ""}
        messageText={shoppingNote?.message ?? ""}
        onClose={() => setShoppingNote(null)}
      />
      <CreateRepairDialog
        open={!!repairNote}
        noteId={repairNote?.id ?? ""}
        messageText={repairNote?.message ?? ""}
        onClose={() => setRepairNote(null)}
      />
      <PromptDialog
        isOpen={showNewThreadPrompt}
        title="Nové téma"
        label="Název tématu"
        placeholder="Např. Opravy na jaře"
        maxLength={100}
        submitLabel="Vytvořit"
        loading={createThread.isPending}
        onSubmit={handleCreateThreadSubmit}
        onCancel={() => setShowNewThreadPrompt(false)}
      />
      <ConfirmDialog
        isOpen={showDeleteThread}
        title="Odstranit téma"
        message={`Opravdu chcete smazat téma „${activeThreadName}"? Všechny zprávy v tomto tématu budou trvale odstraněny.`}
        confirmLabel="Smazat"
        danger
        loading={deleteThread.isPending}
        onConfirm={confirmDeleteThread}
        onCancel={() => setShowDeleteThread(false)}
      />
    </>
  );
}
