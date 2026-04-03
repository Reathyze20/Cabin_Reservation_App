import { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Note } from "@/api/notes";

const REACTION_EMOJI = ["👍", "❤️", "😂", "✅"] as const;

const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000;

interface Props {
  note: Note | null;
  anchorRect: DOMRect | null;
  isMine: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onPin: () => void;
  onAddToShopping: () => void;
  onCreateRepair: () => void;
  onDelete: () => void;
}

export function MessageContextMenu({
  note,
  anchorRect,
  isMine,
  isGuest,
  isAdmin,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onPin,
  onAddToShopping,
  onCreateRepair,
  onDelete,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Capture "now" once when the menu opens (via effect), to avoid impure Date.now() in render
  const [openedAt, setOpenedAt] = useState<number>(0);
  useEffect(() => {
    if (note) setOpenedAt(Date.now());
  }, [note]);

  const canEdit = useMemo(() => {
    if (!note || !openedAt) return false;
    if (!isMine || note.isResolvedAsTask) return false;
    return (openedAt - new Date(note.createdAt).getTime()) < EDIT_TIME_LIMIT_MS;
  }, [note, isMine, openedAt]);

  const myReactions = useMemo(() => new Set(
    (note?.reactions ?? []).filter((r) => r.reacted).map((r) => r.emoji)
  ), [note?.reactions]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!note) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick, true);
    // Close on scroll of the chat messages area
    const chatMessages = document.querySelector(".chat-messages");
    chatMessages?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick, true);
      chatMessages?.removeEventListener("scroll", handleScroll);
    };
  }, [note, onClose]);

  if (!note || !anchorRect) return null;

  const canPin = !isGuest;
  const canDelete = isAdmin || isMine;
  const canDoActions = !isGuest && !note.isResolvedAsTask;

  return (
    <AnimatePresence>
      <div key="backdrop" className="context-menu-backdrop" />
      <PositionedMenu
        key="menu"
        menuRef={menuRef}
        anchorRect={anchorRect}
        isMine={isMine}
      >
        {/* Reaction row */}
        <div className="context-menu-reactions">
          {REACTION_EMOJI.map((emoji) => (
            <button
              key={emoji}
              className={`context-menu-reaction-btn${myReactions.has(emoji) ? " active" : ""}`}
              onClick={() => { onReact(emoji); onClose(); }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="context-menu-divider" />

        {/* Actions */}
        <button className="context-menu-item" onClick={() => { onReply(); onClose(); }}>
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
          <span>Odpovědět</span>
        </button>

        <button className="context-menu-item" onClick={() => { onCopy(); onClose(); }}>
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          <span>Kopírovat text</span>
        </button>

        {canEdit && (
          <button className="context-menu-item" onClick={() => { onEdit(); onClose(); }}>
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            <span>Upravit</span>
          </button>
        )}

        {canPin && (
          <button className="context-menu-item" onClick={() => { onPin(); onClose(); }}>
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1h.5a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5H8a1 1 0 0 1 1 1z" /></svg>
            <span>{note.isPinned ? "Odepnout" : "Připnout"}</span>
          </button>
        )}

        {canDoActions && (
          <>
            <div className="context-menu-divider" />
            <button className="context-menu-item" onClick={() => { onAddToShopping(); onClose(); }}>
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              <span>Do nákupu</span>
            </button>
            <button className="context-menu-item" onClick={() => { onCreateRepair(); onClose(); }}>
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 8v4l3 3" /></svg>
              <span>Nový úkol</span>
            </button>
          </>
        )}

        {canDelete && (
          <>
            <div className="context-menu-divider" />
            <button className="context-menu-item context-menu-item-danger" onClick={() => { onDelete(); onClose(); }}>
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
              <span>Smazat</span>
            </button>
          </>
        )}
      </PositionedMenu>
    </AnimatePresence>
  );
}

/** Measures its own height after mount, positions above or below anchor */
function PositionedMenu({
  menuRef,
  anchorRect,
  isMine,
  children,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  anchorRect: DOMRect;
  isMine: boolean;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null);

  const measure = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const menuH = el.offsetHeight;
    const menuW = el.offsetWidth;
    const gap = 8;

    const spaceAbove = anchorRect.top - gap;
    const spaceBelow = vh - anchorRect.bottom - gap;

    let top: number;
    let above: boolean;

    if (spaceBelow >= menuH) {
      // Fits below
      top = anchorRect.bottom + gap;
      above = false;
    } else if (spaceAbove >= menuH) {
      // Fits above
      top = anchorRect.top - gap - menuH;
      above = true;
    } else {
      // Neither fits perfectly — pick whichever has more room, and clamp
      above = spaceAbove > spaceBelow;
      top = above
        ? Math.max(gap, anchorRect.top - gap - menuH)
        : anchorRect.bottom + gap;
    }

    let left = isMine
      ? Math.max(gap, anchorRect.right - menuW)
      : Math.min(anchorRect.left, vw - menuW - gap);
    left = Math.max(gap, left);

    const origin = above
      ? (isMine ? "bottom right" : "bottom left")
      : (isMine ? "top right" : "top left");

    setPos({ top, left, origin });
  }, [anchorRect, isMine, menuRef]);

  // Measure after first paint
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  return (
    <motion.div
      ref={menuRef}
      className="message-context-menu"
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
        transformOrigin: pos?.origin ?? "top left",
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
