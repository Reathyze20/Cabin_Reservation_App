import { useState, useEffect } from "react";
import type { UserAvailability } from "@/api/reservations";
import {
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
} from "../hooks/useReservations";
import { showToast } from "@/lib/toast";
import { Modal } from "@/components/shared/Modal";
import { getNetworkAwareActionMessage } from "@/lib/networkError";

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const create = useCreateAvailability();
  const update = useUpdateAvailability();
  const del = useDeleteAvailability();

  useEffect(() => {
    if (open) {
      setFrom(fromDate ?? "");
      setTo(toDate ?? "");
      setEditId(null);
      setSubmitError(null);
      setDeleteError(null);
    }
  }, [open, fromDate, toDate]);

  if (!open) return null;

  const startEdit = (a: UserAvailability) => {
    setSubmitError(null);
    setDeleteError(null);
    setEditId(a.id);
    setFrom(a.startDate);
    setTo(a.endDate);
  };

  const cancelEdit = () => {
    setEditId(null);
    setFrom("");
    setTo("");
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) { showToast("Vyplňte datum od a do.", "error"); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, payload: { startDate: from, endDate: to } });
        setEditId(null);
      } else {
        await create.mutateAsync({ startDate: from, endDate: to });
      }
      setFrom("");
      setTo("");
    } catch (error) {
      setSubmitError(
        getNetworkAwareActionMessage(
          error,
          editId
            ? "Dostupnost se nepodařilo upravit. Zkuste to znovu."
            : "Dostupnost se nepodařilo uložit. Zkuste to znovu.",
          editId
            ? "Spojení vypadlo dřív, než se dostupnost stihla upravit. Zkuste to znovu po obnovení připojení."
            : "Spojení vypadlo dřív, než se dostupnost stihla uložit. Zkuste to znovu po obnovení připojení.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await del.mutateAsync(id);
    } catch (error) {
      setDeleteError(
        getNetworkAwareActionMessage(
          error,
          "Dostupnost se nepodařilo smazat. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se dostupnost stihla smazat. Zkuste to znovu po obnovení připojení.",
        ),
      );
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
            <button type="button" className="btn-secondary" onClick={cancelEdit} data-testid="availability-cancel-edit-button">
              Zrušit úpravu
            </button>
          )}
          <button type="submit" form="avail-form" className="btn-primary" disabled={submitting} data-testid="availability-submit-button">
            {submitting ? "Ukládám…" : editId ? "Uložit změny" : "Přidat dostupnost"}
          </button>
        </div>
      }
    >
        <form id="avail-form" onSubmit={handleSubmit} data-testid="availability-form">
          <div className="form-group">
            <label htmlFor="avail-date-from">Od</label>
            <input
              id="avail-date-from"
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setFrom(e.target.value);
              }}
              required
              data-testid="availability-from-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="avail-date-to">Do</label>
            <input
              id="avail-date-to"
              type="date"
              className="form-control"
              value={to}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setTo(e.target.value);
              }}
              required
              data-testid="availability-to-input"
            />
          </div>
          {submitError ? (
            <div className="error-message show" role="alert" data-testid="availability-submit-error">{submitError}</div>
          ) : null}
        </form>

        {myAvailabilities.length > 0 && (
          <div className="my-availabilities" data-testid="availability-list-section">
            <h4 className="modal-section-title">Moje záznamy</h4>
            <ul className="avail-list" data-testid="availability-list">
              {myAvailabilities.map((a) => (
                <li key={a.id} className={`avail-item${editId === a.id ? " is-editing" : ""}`} data-testid="availability-item" data-availability-id={a.id}>
                  <span className="avail-dates">
                    {formatDate(a.startDate)} → {formatDate(a.endDate)}
                  </span>
                  <div className="avail-actions">
                    <button
                      className="avail-btn"
                      onClick={() => startEdit(a)}
                      disabled={deletingId === a.id}
                      data-testid="availability-edit-button"
                    >
                      Upravit
                    </button>
                    <button
                      className="avail-btn avail-btn--danger"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      aria-label="Smazat dostupnost"
                      data-testid="availability-delete-button"
                    >
                      {deletingId === a.id ? "…" : "Smazat"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {deleteError ? (
              <div className="error-message show" role="alert" data-testid="availability-delete-error">{deleteError}</div>
            ) : null}
          </div>
        )}
    </Modal>
  );
}
