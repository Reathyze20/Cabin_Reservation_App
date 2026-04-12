import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/client";
import { useResolveNote } from "./hooks/useNotes";
import { showToast } from "@/lib/toast";
import type { ShoppingList } from "@/api/notes";
import { Modal } from "@/components/shared/Modal";

interface Props {
  open: boolean;
  noteId: string;
  messageText: string;
  onClose: () => void;
}

/** Strip checklist markers, collapse whitespace */
function truncateForItem(text: string, max = 100): string {
  const cleaned = text
    .replace(/^\[[ x]\]\s*/gim, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.substring(0, max - 3) + "...";
}

export function AddToShoppingDialog({ open, noteId, messageText, onClose }: Props) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [itemName, setItemName] = useState(truncateForItem(messageText));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const resolve = useResolveNote();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setItemName(truncateForItem(messageText));
    setLoading(true);
    apiClient
      .get<ShoppingList[]>("/shopping-lists?isPantry=false")
      .then((r) => {
        setLists(r.data);
        if (r.data.length > 0) setSelectedList(r.data[0].id);
      })
      .catch(() => showToast("Nepodařilo se načíst nákupní seznamy.", "error"))
      .finally(() => setLoading(false));
  }, [open, messageText]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open, loading]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = itemName.trim();
    if (!name || !selectedList) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/shopping-list/${selectedList}/items`, {
        name,
        sourceMessageId: noteId,
      });
      await resolve.mutateAsync(noteId);
      showToast("Položka přidána do nákupního seznamu", "success");
      onClose();
    } catch {
      showToast("Nepodařilo se přidat položku.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Přidat do nákupního seznamu"
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
            form="add-to-shopping-form"
            className="button-primary"
            disabled={submitting || loading || lists.length === 0}
          >
            {submitting ? "Ukládám..." : "Přidat  "}
          </button>
        </>
      }
    >
      <form id="add-to-shopping-form" onSubmit={handleSubmit}>
            {loading ? (
              <div className="spinner" />
            ) : lists.length === 0 ? (
              <p>Nejsou žádné aktivní nákupní seznamy. Vytvořte nejprve seznam.</p>
            ) : (
              <>
                <div className="form-group">
                  <label>Seznam:</label>
                  <select
                    className="form-input"
                    value={selectedList}
                    onChange={(e) => setSelectedList(e.target.value)}
                  >
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.items?.filter((i) => !i.purchased).length ?? 0} položek)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Název položky:</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-input"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
              </>
            )}
      </form>
    </Modal>
  );
}
