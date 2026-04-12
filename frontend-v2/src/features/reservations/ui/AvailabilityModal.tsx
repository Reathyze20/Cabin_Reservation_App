import { useState, useEffect } from "react";
import type { UserAvailability } from "@/api/reservations";
import {
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
} from "../hooks/useReservations";
import { showToast } from "@/lib/toast";
import { Modal } from "@/components/shared/Modal";

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  fromDate?: string;
  toDate?: string;
  myAvailabilities: UserAvailability[];
}

export function AvailabilityModal({ open, onClose, fromDate, toDate, myAvailabilities }: Props) {
  const [from, setFrom] = useState(fromDate ?? "");
  const [to, setTo] = useState(toDate ?? "");
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const create = useCreateAvailability();
  const update = useUpdateAvailability();
  const del = useDeleteAvailability();

  useEffect(() => {
    if (open) {
      setFrom(fromDate ?? "");
      setTo(toDate ?? "");
      setEditId(null);
    }
  }, [open, fromDate, toDate]);

  if (!open) return null;

  const startEdit = (a: UserAvailability) => {
    setEditId(a.id);
    setFrom(a.startDate);
    setTo(a.endDate);
  };

  const cancelEdit = () => {
    setEditId(null);
    setFrom("");
    setTo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) { showToast("Vyplňte datum od a do.", "error"); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, payload: { startDate: from, endDate: to } });
        showToast("Dostupnost upravena.", "success");
        setEditId(null);
      } else {
        await create.mutateAsync({ startDate: from, endDate: to });
        showToast("Dostupnost přidána.", "success");
      }
      setFrom("");
      setTo("");
    } catch {
      showToast("Chyba při ukládání dostupnosti.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      showToast("Dostupnost smazána.", "success");
    } catch {
      showToast("Chyba při mazání.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Moje dostupnost"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
          {editId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Zrušit úpravu
            </button>
          )}
          <button type="submit" form="avail-form" className="btn-primary" disabled={submitting}>
            {submitting ? "Ukládám…" : editId ? "Uložit změny" : "Přidat dostupnost"}
          </button>
        </div>
      }
    >
        <form id="avail-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="avail-date-from">Od</label>
            <input
              id="avail-date-from"
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="avail-date-to">Do</label>
            <input
              id="avail-date-to"
              type="date"
              className="form-control"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
        </form>

        {myAvailabilities.length > 0 && (
          <div className="my-availabilities">
            <h4 className="modal-section-title">Moje záznamy</h4>
            <ul className="avail-list">
              {myAvailabilities.map((a) => (
                <li key={a.id} className={`avail-item${editId === a.id ? " is-editing" : ""}`}>
                  <span className="avail-dates">
                    {formatDate(a.startDate)} → {formatDate(a.endDate)}
                  </span>
                  <div className="avail-actions">
                    <button
                      className="avail-btn"
                      onClick={() => startEdit(a)}
                      disabled={deletingId === a.id}
                    >
                      Upravit
                    </button>
                    <button
                      className="avail-btn avail-btn--danger"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      aria-label="Smazat dostupnost"
                    >
                      {deletingId === a.id ? "…" : "Smazat"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
    </Modal>
  );
}
