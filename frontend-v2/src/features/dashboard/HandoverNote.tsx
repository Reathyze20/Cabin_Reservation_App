import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { showToast } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/shared/Modal";

interface Props {
  note: string | null;
  onNoteUpdate: (note: string | null) => void;
}

export function HandoverNote({ note, onNoteUpdate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [draftText, setDraftText] = useState(note?.trim() ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isGuest = user?.role === "guest";

  const saveMutation = useMutation({
    mutationFn: async (newNote: string) => {
      const res = await apiClient.patch<{ pinnedHandoverNote: string | null }>("/workspace/handover-note", {
        note: newNote,
      });
      return res.data.pinnedHandoverNote;
    },
    onSuccess: (savedNote) => {
      onNoteUpdate(savedNote);
      showToast("Vzkaz uložen", "success");
      setModalOpen(false);
    },
    onError: () => {
      showToast("Nepodařilo se uložit vzkaz", "error");
    },
  });

  const openModal = () => {
    setDraftText(note?.trim() ?? "");
    setModalOpen(true);
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const closeModal = () => setModalOpen(false);

  const noteText = note?.trim() ?? "";

  return (
    <>
      <div className="glass-card dashboard-handover-card" id="dashboard-handover-note">
        <div className="card-body-full handover-card-content">
          <div className="dashboard-card-header">
            <span className="dashboard-card-header-title">Vzkaz</span>
            {!isGuest && (
              <button className="handover-edit-btn" id="btn-edit-handover" title="Upravit vzkaz" onClick={openModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          {noteText ? (
            <div
              className="handover-note-text"
              dangerouslySetInnerHTML={{
                __html: noteText
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br>"),
              }}
            />
          ) : (
            <p className="handover-note-empty">
              {isGuest ? "Zatím žádný vzkaz." : "Žádný vzkaz — klikněte na tužku a napište."}
            </p>
          )}
          {noteText && (
            <div className="card-footer">
              <span className="card-footer-meta">Vzkaz pro návštěvníky</span>
              <a
                href="/notes"
                className="dashboard-card-header-link"
                onClick={(e) => { e.preventDefault(); navigate("/notes"); }}
              >
                Přejít do chatu →
              </a>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Vzkaz"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button className="button-secondary" onClick={closeModal}>Zrušit</button>
            <button
              className="button-primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(draftText)}
            >
              Uložit vzkaz
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12, fontSize: '0.9rem' }}>
          Zanechte vzkaz pro ostatní návštěvníky (max 300 znaků).
        </p>
        <textarea
          ref={textareaRef}
          className="handover-textarea"
          maxLength={300}
          placeholder="Napište vzkaz…"
          rows={5}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
        />
        <div className="handover-char-counter">
          <span>{draftText.length}</span>/300
        </div>
      </Modal>
    </>
  );
}
