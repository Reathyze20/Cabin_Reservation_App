import { motion } from "framer-motion";
import type { NoteThread } from "@/api/notes";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";

interface UserMap {
  [username: string]: { color?: string; animalIcon?: string | null };
}

interface Props {
  threads: NoteThread[];
  activeThreadId: string | null;
  searchQuery: string;
  userMap: UserMap;
  onSearchChange: (q: string) => void;
  onSelectThread: (id: string | null) => void;
  onCreateThread: () => void;
}

/**
 * Odstraní markdown syntaxi z náhledu poslední zprávy — v jednořádkovém
 * preview by hvězdičky a checkboxy působily jako rozbitý text.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')          // code blocks
    .replace(/`([^`]*)`/g, '$1')              // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2')       // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')          // italic
    .replace(/~~(.*?)~~/g, '$1')              // strikethrough
    .replace(/^\s*-\s*\[[ xX]\]\s*/gm, '')    // task list checkboxes
    .replace(/^\s*[-*+]\s+/gm, '')            // bullet markers
    .replace(/^\s*\d+\.\s+/gm, '')            // ordered list markers
    .replace(/^\s*>\s?/gm, '')                // blockquotes
    .replace(/\s+/g, ' ')
    .trim()
}

function formatThreadTime(isoStr: string): string {
  const d = new Date(isoStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function ThreadList({
  threads,
  activeThreadId,
  searchQuery,
  userMap,
  onSearchChange,
  onSelectThread,
  onCreateThread,
}: Props) {
  // threads already includes "Hlavní" as first item from backend
  const filtered = threads
    .filter((t) =>
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <div className="notes-sidebar" id="notes-sidebar" data-testid="notes-thread-sidebar">
      <div className="notes-sidebar-header">
        <div className="notes-sidebar-title">
          <h2>Témata</h2>
        </div>
        <div className="notes-search">
          <input
            type="text"
            id="thread-search-input"
            placeholder="Hledat téma..."
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="notes-thread-search-input"
          />
        </div>
      </div>

      <div className="notes-thread-list" id="chat-tabs-list" data-testid="notes-thread-list">
        {filtered.map((t, index) => {
          let lastText = "Žádné zprávy";
          let lastTime = "";
          if (t.lastMessage) {
            let raw = stripMarkdown(t.lastMessage);
            if (raw.length > 30) raw = raw.substring(0, 30) + "...";
            lastText = raw;
            if (t.lastMessageAt) lastTime = formatThreadTime(t.lastMessageAt);
          }

          const isActive = activeThreadId === t.id;
          const isUnread = !isActive && !!t.hasUnread;
          const lastAuthor = t.lastMessageBy ?? null;
          const authorInfo = lastAuthor ? userMap[lastAuthor] : undefined;

          return (
            <motion.div
              key={t.id ?? "__main__"}
              className={`thread-item${isActive ? " active" : ""}${isUnread ? " unread" : ""}`}
              data-id={t.id ?? ""}
              onClick={() => onSelectThread(t.id ?? null)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.07, 0.35) }}
              data-testid="notes-thread-item"
              data-thread-id={t.id ?? '__main__'}
            >
              <AnimalAvatar
                icon={authorInfo?.animalIcon ?? null}
                username={lastAuthor ?? t.name}
                color={authorInfo?.color}
                size={40}
                className="thread-avatar"
              />
              <div className="thread-info">
                <div className="thread-info-top">
                  <span className="thread-name">{t.name}</span>
                  <div className="thread-meta-right">
                    <span className="thread-time">{lastTime}</span>
                    {isUnread && <div className="unread-badge" />}
                  </div>
                </div>
                <div className="thread-info-bottom">
                  <span className="thread-last-message">{lastText}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn-primary sidebar-footer-btn"
          onClick={onCreateThread}
          data-testid="notes-create-thread-button"
        >
          Nové téma
        </button>
      </div>
    </div>
  );
}
