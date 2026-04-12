import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/client";
import { useResolveNote } from "./hooks/useNotes";
import { showToast } from "@/lib/toast";
import { Modal } from "@/components/shared/Modal";

interface Props {
  open: boolean;
  noteId: string;
  messageText: string;
  onClose: () => void;
}

type Category = "task" | "idea" | "company";

/** Strip checklist markers and collapse whitespace */
function truncateForItem(text: string, max = 200): string {
  const cleaned = text
    .replace(/^\[[ x]\]\s*/gim, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.substring(0, max - 3) + "...";
}

export function CreateRepairDialog({ open, noteId, messageText, onClose }: Props) {
  const [category, setCategory] = useState<Category>("task");
  const [title, setTitle] = useState(truncateForItem(messageText));
  const [submitting, setSubmitting] = useState(false);
  const resolve = useResolveNote();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(truncateForItem(messageText));
      setCategory("task");
    }
  }, [open, messageText]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSubmitting(true);
    try {
      await apiClient.post("/reconstruction", {
        category,
        title: t,
        description: messageText,
        sourceMessageId: noteId,
      });
      await resolve.mutateAsync(noteId);
      showToast("Úkol vytvořen v rekonstrukcích", "success");
      onClose();
    } catch {
      showToast("Nepodařilo se vytvořit úkol.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Vytvořit úkol v rekonstrukcích"
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
          >
            Zrušit
          </button>
          <button
            type="submit"
            form="create-repair-form"
            className="button-primary"
            disabled={submitting}
          >
            {submitting ? "Ukládám..." : "Vytvořit"}
          </button>
        </>
      }
    >
      <form id="create-repair-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Kategorie:</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                <option value="task">Úkol</option>
                <option value="idea">Nápad</option>
                <option value="company">Firma / Kontakt</option>
              </select>
            </div>
            <div className="form-group">
              <label>Název:</label>
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
      </form>
    </Modal>
  );
}
