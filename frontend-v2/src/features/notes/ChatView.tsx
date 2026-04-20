import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { Note } from "@/api/notes";
import { MessageBubble } from "./MessageBubble";
import { MessageContextMenu } from "./MessageContextMenu";
import { useDeleteNote, useEditNote, useTogglePin, useToggleReaction } from "./hooks/useNotes";
import { showToast } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";
import { getNetworkAwareActionMessage } from "@/lib/networkError";

interface UserMap {
  [username: string]: { color?: string; animalIcon?: string | null };
}

interface Props {
  notes: Note[];
  activeThreadId: string | null;
  activeThreadName: string;
  userMap: UserMap;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onFetchMore?: () => void;
  onAddToShopping: (note: Note) => void;
  onCreateRepair: (note: Note) => void;
  onReply: (note: Note) => void;
  onDeleteThread?: () => void;
}

export function ChatView({
  notes,
  activeThreadId,
  activeThreadName,
  userMap,
  hasMore,
  isFetchingMore,
  onFetchMore,
  onAddToShopping,
  onCreateRepair,
  onReply,
  onDeleteThread,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGuest = user?.role === "guest";
  const deleteNote = useDeleteNote();
  const editNote = useEditNote();
  const togglePin = useTogglePin();
  const toggleReaction = useToggleReaction();

  // ── Delete confirmation ─────────────────────────────────────────
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteNoteError, setDeleteNoteError] = useState<string | null>(null);

  // ── Context menu state ─────────────────────────────────────────
  const [contextNote, setContextNote] = useState<Note | null>(null);
  const [contextRect, setContextRect] = useState<DOMRect | null>(null);

  // ── Edit mode ──────────────────────────────────────────────────
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Filters ─────────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authorFilter, setAuthorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Auto-scroll ──────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Apply filters
  const filtered = notes.filter((n) => {
    if (authorFilter && n.username !== authorFilter) return false;
    const dStr = new Date(n.createdAt).toISOString().split("T")[0];
    if (dateFrom && dStr < dateFrom) return false;
    if (dateTo && dStr > dateTo) return false;
    return true;
  });

  // Smart auto-scroll: only scroll to bottom when user is already near the bottom
  const isNearBottomRef = useRef(true);

  // Track scroll position to detect if user is near bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 150;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to bottom only if user was already near the bottom
  useEffect(() => {
    if (isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered.length, activeThreadId]);

  // Load more messages when scrolling to top
  useEffect(() => {
    const el = listRef.current;
    if (!el || !hasMore || isFetchingMore) return;
    const handleScroll = () => {
      if (el.scrollTop < 100 && hasMore && !isFetchingMore && onFetchMore) {
        onFetchMore();
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetchingMore, onFetchMore]);

  // Focus edit textarea when entering edit mode
  useEffect(() => {
    if (editingNote && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editingNote, editText.length]);

  // Unique authors for filter dropdown
  const uniqueAuthors = [...new Set(notes.map((n) => n.username))].sort();

  // Participants avatar colors
  const participantInfo = useMemo(() => {
    const seen = new Set<string>();
    const result: { username: string; color: string; animalIcon: string | null }[] = [];
    let total = 0;
    for (const n of notes) {
      if (!seen.has(n.username)) {
        seen.add(n.username);
        total++;
        if (result.length < 3) {
          result.push({
            username: n.username,
            color: userMap[n.username]?.color ?? '#a3b19b',
            animalIcon: userMap[n.username]?.animalIcon ?? null,
          });
        }
      }
    }
    return { avatars: result, remaining: total - result.length };
  }, [notes, userMap]);

  // ── Context menu handlers ─────────────────────────────────────
  const handleOpenContext = useCallback((note: Note, rect: DOMRect) => {
    setContextNote(note);
    setContextRect(rect);
  }, []);

  const handleCloseContext = useCallback(() => {
    setContextNote(null);
    setContextRect(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (contextNote) {
      navigator.clipboard.writeText(contextNote.message).then(() => {
        showToast("Zkopírováno", "success");
      });
    }
  }, [contextNote]);

  const handleReply = useCallback(() => {
    if (contextNote) onReply(contextNote);
  }, [contextNote, onReply]);

  const handleEdit = useCallback(() => {
    if (contextNote) {
      setEditError(null);
      setEditingNote(contextNote);
      setEditText(contextNote.message);
    }
  }, [contextNote]);

  const handlePin = useCallback(() => {
    if (contextNote) {
      togglePin.mutate({ id: contextNote.id, threadId: activeThreadId });
    }
  }, [contextNote, togglePin, activeThreadId]);

  const handleReact = useCallback((emoji: string) => {
    if (contextNote) {
      toggleReaction.mutate({ id: contextNote.id, emoji, threadId: activeThreadId });
    }
  }, [contextNote, toggleReaction, activeThreadId]);

  const handleToggleReaction = useCallback((noteId: string, emoji: string) => {
    toggleReaction.mutate({ id: noteId, emoji, threadId: activeThreadId });
  }, [toggleReaction, activeThreadId]);

  const handleContextDelete = useCallback(() => {
    if (contextNote) {
      setDeleteNoteError(null);
      setDeleteNoteId(contextNote.id);
    }
  }, [contextNote]);

  const handleContextShopping = useCallback(() => {
    if (contextNote) onAddToShopping(contextNote);
  }, [contextNote, onAddToShopping]);

  const handleContextRepair = useCallback(() => {
    if (contextNote) onCreateRepair(contextNote);
  }, [contextNote, onCreateRepair]);

  const confirmDeleteNote = async () => {
    if (!deleteNoteId) return;
    setDeleteNoteError(null);
    try {
      await deleteNote.mutateAsync({ id: deleteNoteId, threadId: activeThreadId });
      setDeleteNoteId(null);
    } catch (error) {
      setDeleteNoteError(
        getNetworkAwareActionMessage(
          error,
          "Zprávu se nepodařilo smazat. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se zpráva stihla smazat. Zkuste to znovu po obnovení připojení.",
        ),
      );
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editingNote || !editText.trim()) return;
    setEditError(null);
    try {
      await editNote.mutateAsync({
        id: editingNote.id,
        message: editText.trim(),
        threadId: activeThreadId,
      });
      setEditingNote(null);
      setEditText("");
    } catch (error) {
      setEditError(
        getNetworkAwareActionMessage(
          error,
          "Zprávu se nepodařilo upravit. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se zpráva stihla upravit. Zkuste to znovu po obnovení připojení.",
        ),
      );
    }
  };

  const handleEditCancel = () => {
    setEditingNote(null);
    setEditText("");
    setEditError(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  // ── Scroll to reply target (CSS.escape for safety) ─────────────────
  const handleReplyClick = useCallback((replyToId: string) => {
    const el = listRef.current?.querySelector(`[data-id="${CSS.escape(replyToId)}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("message-highlight");
      setTimeout(() => el.classList.remove("message-highlight"), 1500);
    }
  }, []);

  // ── Thread menu state ──────────────────────────────────────────
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);

  // ── Date separator + message grouping helpers ─────────────────
  const formatDateSeparator = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Dnes";
    if (d.toDateString() === yesterday.toDateString()) return "Včera";
    return `${d.getDate()}. ${d.toLocaleString("cs-CZ", { month: "long" })}`;
  }, []);

  const isGroupedWithPrev = useCallback((curr: Note, prev: Note | undefined) => {
    if (!prev) return false;
    if (curr.userId !== prev.userId) return false;
    const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return diff < 5 * 60_000; // < 5 minutes
  }, []);

  // Participant names for header subtitle
  const participantNames = useMemo(() => {
    const total = participantInfo.avatars.length + participantInfo.remaining;
    if (total === 0) return "";
    if (total === 1) return "1 účastník";
    const names = participantInfo.avatars.map((a) => a.username).join(", ");
    if (participantInfo.remaining > 0) return `${names} a ${participantInfo.remaining} dalších`;
    return `${total} účastníci`;
  }, [participantInfo]);

  return (
    <div className="notes-chat-area" id="notes-chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h3 id="active-thread-name">{activeThreadName}</h3>
          {participantNames && (
            <span className="chat-header-participants">{participantNames}</span>
          )}
        </div>
        {/* Overlapping avatar group — max 3 participants + remaining count */}
        {participantInfo.avatars.length > 0 && (
          <div className="chat-avatar-group" aria-label="Účastníci">
            {participantInfo.avatars.map((p) => (
              <AnimalAvatar
                key={p.username}
                icon={p.animalIcon}
                username={p.username}
                color={p.color}
                size={28}
                className="chat-avatar-group-item"
              />
            ))}
            {participantInfo.remaining > 0 && (
              <span className="chat-avatar-remaining" title={`+${participantInfo.remaining} dalších účastníků`}>
                +{participantInfo.remaining}
              </span>
            )}
          </div>
        )}
        <div className="chat-header-actions">
          <button
            id="toggle-filters-btn"
            className="button-icon"
            title="Filtry"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-label="Filtry zpráv"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          </button>
          {/* Thread action menu */}
          {activeThreadId !== null && (
            <div className="thread-menu-wrapper">
              <button
                className="button-icon"
                title="Akce tématu"
                onClick={() => setThreadMenuOpen((o) => !o)}
                aria-label="Akce tématu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
              </button>
              {threadMenuOpen && (
                <div className="thread-action-menu">
                  <button
                    className="thread-action-item thread-action-danger"
                    onClick={() => {
                      setThreadMenuOpen(false);
                      if (onDeleteThread) onDeleteThread();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                    <span>Smazat téma</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters panel */}
      <div
        id="filters-panel"
        className={`filters-container${filtersOpen ? "" : " collapsed"}`}
      >
        <div className="filter-group">
          <select
            id="author-filter"
            aria-label="Autor"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
          >
            <option value="">Všichni autoři</option>
            {uniqueAuthors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="date-from-filter">Od:</label>
          <input
            type="date"
            id="date-from-filter"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="date-to-filter">Do:</label>
          <input
            type="date"
            id="date-to-filter"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          id="reset-filters-btn"
          className="button-secondary"
          title="Smazat filtry"
          onClick={() => {
            setAuthorFilter("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="notes-list" ref={listRef}>
        {/* Load more indicator at top */}
        {hasMore && (
          <div className="load-more-indicator">
            {isFetchingMore ? (
              <span className="load-more-spinner" />
            ) : (
              <button className="btn-chip load-more-btn" onClick={() => onFetchMore?.()}>
                Načíst starší zprávy
              </button>
            )}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="empty-chat-state">
            <span className="empty-chat-state-icon"></span>
            <p className="empty-chat-state-text">Zatím tu je ticho...<br />Napište první zprávu.</p>
          </div>
        ) : (
          <>
            {filtered.map((note, index) => {
              const prevNote = index > 0 ? filtered[index - 1] : undefined;
              const grouped = isGroupedWithPrev(note, prevNote);

              // Date separator: show when day changes
              const currDate = new Date(note.createdAt).toDateString();
              const prevDate = prevNote ? new Date(prevNote.createdAt).toDateString() : null;
              const showDateSep = !prevDate || currDate !== prevDate;

              // If this note is being edited, show inline edit
              if (editingNote?.id === note.id) {
                const wrapperCls = [
                  "message-wrapper",
                  note.userId === user?.userId ? "message-mine" : "message-other",
                ].join(" ");

                return (
                  <div key={note.id}>
                    {showDateSep && (
                      <div className="date-separator">
                        <span className="date-separator-label">{formatDateSeparator(note.createdAt)}</span>
                      </div>
                    )}
                    <div className={wrapperCls} data-id={note.id}>
                      <div className="message-bubble message-bubble-editing">
                        <textarea
                          ref={editTextareaRef}
                          className="message-edit-textarea"
                          value={editText}
                          onChange={(e) => {
                            if (editError) setEditError(null);
                            setEditText(e.target.value);
                          }}
                          onKeyDown={handleEditKeyDown}
                          maxLength={2000}
                        />
                        <div className="message-edit-actions">
                          <button
                            className="btn-ghost-secondary"
                            onClick={handleEditCancel}
                          >
                            Zrušit
                          </button>
                          <button
                            className="button-primary message-edit-save"
                            onClick={handleEditSave}
                            disabled={!editText.trim() || editNote.isPending}
                          >
                            {editNote.isPending ? "…" : "Uložit"}
                          </button>
                        </div>
                        {editError ? (
                          <div className="error-message show" role="alert">{editError}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={note.id}>
                  {showDateSep && (
                    <div className="date-separator">
                      <span className="date-separator-label">{formatDateSeparator(note.createdAt)}</span>
                    </div>
                  )}
                  <MessageBubble
                    note={note}
                    isMine={note.userId === user?.userId}
                    canDelete={isAdmin || note.userId === user?.userId}
                    isGuest={isGuest ?? false}
                    isGrouped={grouped}
                    userInfo={userMap[note.username]}
                    onContextMenu={handleOpenContext}
                    onToggleReaction={handleToggleReaction}
                    onReplyClick={handleReplyClick}
                  />
                </div>
              );
            })}
            {/* Sentinel div for auto-scroll */}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Context Menu */}
      <MessageContextMenu
        note={contextNote}
        anchorRect={contextRect}
        isMine={contextNote?.userId === user?.userId}
        isGuest={isGuest ?? false}
        isAdmin={isAdmin ?? false}
        onClose={handleCloseContext}
        onReact={handleReact}
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onPin={handlePin}
        onAddToShopping={handleContextShopping}
        onCreateRepair={handleContextRepair}
        onDelete={handleContextDelete}
      />

      <ConfirmDialog
        isOpen={deleteNoteId !== null}
        title="Smazat zprávu"
        message="Opravdu chcete smazat tuto zprávu?"
        confirmLabel="Smazat"
        danger
        loading={deleteNote.isPending}
        errorMessage={deleteNoteError}
        onConfirm={confirmDeleteNote}
        onCancel={() => {
          setDeleteNoteId(null);
          setDeleteNoteError(null);
        }}
      />
    </div>
  );
}
