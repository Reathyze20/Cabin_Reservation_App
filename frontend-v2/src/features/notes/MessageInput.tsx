import { useRef, useState, useEffect } from "react";
import { useSendNote } from "./hooks/useNotes";
import type { Note } from "@/api/notes";
import { getNetworkAwareActionMessage, isNetworkError } from "@/lib/networkError";

const HANDOVER_ITEMS = [
  { key: "kamna", label: "Kamna: Popel vybrán, vyhasnuto" },
  { key: "drevo", label: "Dřevo: Třísky a polena pro dalšího připraveny" },
  { key: "jidlo", label: "Jídlo: Uklizeno (ochrana před myšmi)" },
  { key: "voda", label: "Voda: Kohoutky zavřeny, trubky vypuštěny" },
  { key: "zabezpeceni", label: "Zabezpečení: Okenice a dveře zajištěny" },
];

interface Props {
  activeThreadId: string | null;
  replyTo?: Note | null;
  onCancelReply?: () => void;
}

export function MessageInput({ activeThreadId, replyTo, onCancelReply }: Props) {
  const [message, setMessage] = useState("");
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverChecks, setHandoverChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(HANDOVER_ITEMS.map((i) => [i.key, true])),
  );
  const [handoverNote, setHandoverNote] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendNote = useSendNote();

  // Auto-resize textarea
  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "36px";
    const newHeight = Math.min(ta.scrollHeight, 150);
    ta.style.height = newHeight + "px";
    ta.style.overflowY = ta.scrollHeight > 150 ? "auto" : "hidden";
  };

  const handleSend = async () => {
    const msg = message.trim();
    if (!msg) return;
    setSendError(null);
    try {
      await sendNote.mutateAsync({
        message: msg,
        threadId: activeThreadId,
        replyToId: replyTo?.id ?? null,
      });
      setMessage("");
      if (onCancelReply) onCancelReply();
      if (textareaRef.current) {
        textareaRef.current.style.height = "36px";
        textareaRef.current.style.overflowY = "hidden";
      }
    } catch (error) {
      if (isNetworkError(error)) return;
      setSendError(
        getNetworkAwareActionMessage(
          error,
          "Zprávu se nepodařilo odeslat. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se zpráva stihla odeslat. Zkuste to znovu po obnovení připojení.",
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  // Build handover protocol text and insert into textarea
  const insertHandover = () => {
    const lines: string[] = ["Odjezdový protokol:", ""];
    HANDOVER_ITEMS.forEach((item) => {
      const checked = handoverChecks[item.key] ?? true;
      lines.push(`${checked ? "[x]" : "[ ]"} ${item.label}`);
    });
    if (handoverNote.trim()) {
      lines.push("");
      lines.push(`Poznámka: ${handoverNote.trim()}`);
    }
    const existing = message.trimEnd();
    const text = existing.length > 0
      ? existing + "\n\n" + lines.join("\n")
      : lines.join("\n");
    setSendError(null);
    setMessage(text);
    setHandoverOpen(false);
    setHandoverNote("");
    setHandoverChecks(Object.fromEntries(HANDOVER_ITEMS.map((i) => [i.key, true])));
    // Focus textarea
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        autoResize();
      }
    }, 0);
  };

  const toggleCheck = (key: string) => {
    setHandoverChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Focus textarea when reply starts
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  return (
    <div className="chat-footer-wrapper" data-testid="notes-message-input">
      {/* Reply preview */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <span className="reply-preview-author">{replyTo.username}</span>
            <span className="reply-preview-text">
              {replyTo.message.length > 80
                ? replyTo.message.slice(0, 80) + "…"
                : replyTo.message}
            </span>
          </div>
          <button
            type="button"
            className="reply-preview-close"
            onClick={onCancelReply}
            title="Zrušit odpověď"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Odjezdový protokol panel */}
      {handoverOpen && (
        <div className="handover-panel" id="handover-panel">
          <div className="handover-panel-header">
            <span>Odjezdový protokol</span>
            <button
              type="button"
              className="button-icon"
              id="handover-panel-close"
              title="Zavřít"
              onClick={() => setHandoverOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="handover-checklist" id="handover-checklist">
            {HANDOVER_ITEMS.map((item) => (
              <label key={item.key} className="handover-item">
                <input
                  type="checkbox"
                  name={item.key}
                  checked={handoverChecks[item.key] ?? true}
                  onChange={() => toggleCheck(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="handover-note-row">
            <input
              type="text"
              id="handover-note-input"
              placeholder="Poznámka (volitelná)..."
              autoComplete="off"
              value={handoverNote}
              onChange={(e) => {
                if (sendError) setSendError(null);
                setHandoverNote(e.target.value);
              }}
            />
          </div>
          <div className="handover-panel-footer">
            <button
              type="button"
              className="btn-ghost-secondary"
              id="handover-panel-cancel"
              onClick={() => setHandoverOpen(false)}
            >
              Zrušit
            </button>
            <button
              type="button"
              className="button-primary"
              id="handover-panel-insert"
              onClick={insertHandover}
            >
              Vložit do zprávy
            </button>
          </div>
        </div>
      )}

      {/* Chip action buttons above input */}
      <div className="chat-actions-row">
        <button
          type="button"
          className="btn-chip btn-chip-action"
          onClick={() => setHandoverOpen((o) => !o)}
          data-testid="notes-handover-toggle-button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          Odjezdový protokol
        </button>
      </div>

      <div className="chat-input-row">
        {/* Sponka — VENKU vlevo od pilulky */}
        <button
          type="button"
          className="icon-btn attach-btn"
          title="Přílohy — připravujeme"
          disabled
          aria-label="Přidat přílohu (připravujeme)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Bílá pilulka */}
        <form
          className="fake-input-wrapper pill-shape"
          noValidate
          onSubmit={handleFormSubmit}
          data-testid="notes-message-form"
        >
          <textarea
            ref={textareaRef}
            className="transparent-text-input"
            placeholder="Napište zprávu…"
            rows={1}
            maxLength={2000}
            required
            value={message}
            onChange={(e) => {
              if (sendError) setSendError(null);
              setMessage(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            data-testid="notes-message-textarea"
          />
          <button
            type="submit"
            className="send-message-btn"
            aria-label="Odeslat"
            disabled={sendNote.isPending}
            title={sendNote.isPending ? "Odesílám…" : "Odeslat (Enter)"}
            data-testid="notes-send-button"
          >
            {sendNote.isPending ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.7s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ transform: "translate(1px, -0.5px)" }}>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </form>
      </div>
      {sendError ? (
        <div className="error-message show" role="alert">{sendError}</div>
      ) : null}
    </div>
  );
}
