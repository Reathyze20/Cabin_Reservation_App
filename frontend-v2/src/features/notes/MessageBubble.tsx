import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Note } from "@/api/notes";
import { AnimalAvatar } from '@/components/shared/AnimalAvatar';
import { ReactionBar } from './ReactionBar';
import { escapeHtml } from '@/lib/utils';

interface UserInfo {
  color?: string;
  animalIcon?: string | null;
}

interface Props {
  note: Note;
  isMine: boolean;
  canDelete: boolean;
  isGuest: boolean;
  isGrouped?: boolean;
  userInfo?: UserInfo;
  onContextMenu: (note: Note, rect: DOMRect) => void;
  onToggleReaction: (noteId: string, emoji: string) => void;
  onReplyClick?: (replyToId: string) => void;
}

/** Convert [x]/[ ] checklist lines into HTML spans */
function formatMessage(raw: string): string {
  const lines = raw
    .split("\n")
    .map((line) => line.replace(/^\|\s*/, ""));

  const hasChecks = lines.some((l) => /^\[[ x]\]/i.test(l));
  if (!hasChecks) return lines.join("<br>");

  const parts = lines.map((line) => {
    const done = line.match(/^\[x\]\s*(.*)/i);
    const todo = line.match(/^\[ \]\s*(.*)/);
    if (done)
      return `<span class="msg-cb msg-cb-done">✓ <span>${done[1]}</span></span>`;
    if (todo)
      return `<span class="msg-cb msg-cb-todo">○ <span>${todo[1]}</span></span>`;
    return line === ""
      ? `<span class="msg-spacer"></span>`
      : `<span class="msg-line">${line}</span>`;
  });
  return `<div class="msg-protocol">${parts.join("")}</div>`;
}

export function MessageBubble({
  note,
  isMine,
  canDelete: _canDelete,
  isGuest: _isGuest,
  isGrouped = false,
  userInfo,
  onContextMenu,
  onToggleReaction,
  onReplyClick,
}: Props) {
  const resolved = note.isResolvedAsTask === true;
  const userColor = userInfo?.color || "#a3b19b";
  const animalIcon = userInfo?.animalIcon ?? null;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const d = new Date(note.createdAt);
  const timeFmt = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dateFmt = `${d.getDate()}.${d.getMonth() + 1}.`;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (bubbleRef.current) {
      onContextMenu(note, bubbleRef.current.getBoundingClientRect());
    }
  }, [note, onContextMenu]);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleRef.current) {
        if (navigator.vibrate) navigator.vibrate(50);
        onContextMenu(note, bubbleRef.current.getBoundingClientRect());
      }
    }, 500);
  }, [note, onContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleReplyQuoteClick = useCallback(() => {
    if (note.replyTo?.id && onReplyClick) {
      onReplyClick(note.replyTo.id);
    }
  }, [note.replyTo, onReplyClick]);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (bubbleRef.current) {
      onContextMenu(note, bubbleRef.current.getBoundingClientRect());
    }
  }, [note, onContextMenu]);

  const resolvedBadge = resolved ? (
    <span className="message-resolved-badge" title="Převedeno na úkol">
      ✅
    </span>
  ) : null;

  const pinBadge = note.isPinned ? (
    <span className="message-pin-badge" title="Připnuto">
      📌
    </span>
  ) : null;

  const editedLabel = note.editedAt ? (
    <span className="message-edited-label">(upraveno)</span>
  ) : null;

  const replyQuote = note.replyTo ? (
    <div className="message-reply-quote" onClick={handleReplyQuoteClick}>
      <span className="reply-quote-author">{note.replyTo.username}</span>
      <span className="reply-quote-text">{note.replyTo.message}</span>
    </div>
  ) : null;

  const timeDisplay = (
    <span className="message-time">
      {timeFmt}
      {editedLabel}
    </span>
  );

  const reactions = note.reactions && note.reactions.length > 0 ? (
    <ReactionBar
      reactions={note.reactions}
      onToggle={(emoji) => onToggleReaction(note.id, emoji)}
    />
  ) : null;

  const wrapperCls = [
    "message-wrapper",
    isMine ? "message-mine" : "message-other",
    resolved ? "message-resolved" : "",
    isGrouped ? "message-grouped" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bubbleContent = (
    <>
      {/* Sender name rendered inside the bubble (other messages only) — isMine handled at render site */}
      {replyQuote}
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formatMessage(escapeHtml(note.message)) }}
      />
      <div className="message-footer">
        {resolvedBadge}
        {pinBadge}
        {timeDisplay}
      </div>
    </>
  );

  if (isMine) {
    return (
      <motion.div
        className={wrapperCls}
        data-id={note.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="message-bubble-outer">
          <div
            ref={bubbleRef}
            className="message-bubble"
            title={`${dateFmt} ${timeFmt}`}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            <button
              className="message-action-trigger"
              aria-label="Akce zprávy"
              onClick={handleTriggerClick}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 17.414l-6.707-6.707a1 1 0 0 1 1.414-1.414L12 14.586l5.293-5.293a1 1 0 0 1 1.414 1.414L12 17.414z" />
              </svg>
            </button>
            {bubbleContent}
          </div>
          {reactions}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={wrapperCls}
      data-id={note.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="message-avatar">
        {!isGrouped && <AnimalAvatar icon={animalIcon} username={note.username} color={userColor} size={36} />}
      </div>
      <div className="message-bubble-container">
        <div className="message-bubble-outer">
          <div
            ref={bubbleRef}
            className="message-bubble"
            title={`${dateFmt} ${timeFmt}`}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            <button
              className="message-action-trigger"
              aria-label="Akce zprávy"
              onClick={handleTriggerClick}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 17.414l-6.707-6.707a1 1 0 0 1 1.414-1.414L12 14.586l5.293-5.293a1 1 0 0 1 1.414 1.414L12 17.414z" />
              </svg>
            </button>
            {/* Sender name inside the bubble — hidden when grouped */}
            {!isGrouped && <span className="message-bubble-sender">{note.username}</span>}
            {bubbleContent}
          </div>
          {reactions}
        </div>
      </div>
    </motion.div>
  );
}
