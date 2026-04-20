import { useState, useEffect, useRef } from "react";
import type { Reservation } from "@/api/reservations";
import { useCreateReservation, useUpdateReservation, useDeleteReservation } from "../hooks/useReservations";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { getNetworkAwareActionMessage } from "@/lib/networkError";

interface Props {
  open: boolean;
  onClose: () => void;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
  existing?: Reservation | null;
  allReservations: Reservation[];
  /** Called after successful create so parent can check inventory */
  onCreated?: (id: string) => void;
}

export function BookingForm({ open, onClose, fromDate, toDate, existing, allReservations, onCreated }: Props) {
  const isEdit = !!existing;

  const [from, setFrom] = useState(fromDate ?? "");
  const [to, setTo] = useState(toDate ?? "");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [handover, setHandover] = useState("");
  const [soft, setSoft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [backupWarning, setBackupWarning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fromRef = useRef<HTMLInputElement>(null);

  const create = useCreateReservation();
  const update = useUpdateReservation();
  const del = useDeleteReservation();

  // Pre-fill when editing
  useEffect(() => {
    if (existing) {
      setFrom(existing.from ?? "");
      setTo(existing.to ?? "");
      setPurpose(existing.purpose ?? "");
      setNotes(existing.notes ?? "");
      setHandover(existing.handoverNote ?? "");
      setSoft(existing.status === "soft");
    } else {
      setFrom(fromDate ?? "");
      setTo(toDate ?? "");
      setPurpose("");
      setNotes("");
      setHandover("");
      setSoft(false);
    }
    setBackupWarning(false);
    setSubmitError(null);
    setDeleteError(null);
  }, [existing, fromDate, toDate, open]);

  // Check for overlapping non-backup reservations
  useEffect(() => {
    if (!from || !to) { setBackupWarning(false); return; }
    const f = new Date(from + "T00:00:00");
    const t = new Date(to + "T00:00:00");
    const overlaps = allReservations.some((r) => {
      if (r.status === "backup") return false;
      if (isEdit && r.id === existing?.id) return false;
      const rf = new Date(r.from + "T00:00:00");
      const rt = new Date(r.to + "T00:00:00");
      return rf <= t && rt >= f;
    });
    setBackupWarning(overlaps);
  }, [from, to, allReservations, isEdit, existing?.id]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) { showToast("Vyplňte datum příjezdu a odjezdu.", "error"); return; }
    if (new Date(to) < new Date(from)) { showToast("Datum odjezdu nesmí být před příjezdem.", "error"); return; }
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { from, to, purpose, notes, handoverNote: handover, soft };
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, payload });
        onClose();
      } else {
        const res = await create.mutateAsync(payload);
        onCreated?.(res.id);
        onClose();
      }
    } catch (error) {
      setSubmitError(
        getNetworkAwareActionMessage(
          error,
          "Rezervaci se nepodařilo uložit. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se rezervace stihla uložit. Zkuste to znovu po obnovení připojení.",
        ),
      );
    } finally {
      setSubmitting(false);
      if (btn) btn.disabled = false;
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await del.mutateAsync(existing.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      setDeleteError(
        getNetworkAwareActionMessage(
          error,
          "Rezervaci se nepodařilo smazat. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se rezervace stihla smazat. Zkuste to znovu po obnovení připojení.",
        ),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? "Upravit rezervaci" : "Nová rezervace"}
      maxWidth="max-w-lg"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          {isEdit && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              style={{ marginRight: 'auto' }}
            >
              Smazat
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
            style={!isEdit ? { marginLeft: 'auto' } : undefined}
          >
            Zrušit
          </button>
          <button
            type="submit"
            form="booking-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Ukládám…" : isEdit ? "Uložit změny" : "Vytvořit rezervaci"}
          </button>
        </div>
      }
    >
        <form id="booking-form" onSubmit={handleSubmit}>
          <input type="hidden" value={existing?.id ?? ""} />

          {backupWarning && (
            <div className="backup-warning-message">
              V tomto termínu existuje jiná rezervace. Vaše bude uložena jako záložní.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="modal-date-from">Příjezd</label>
            <input
              ref={fromRef}
              id="modal-date-from"
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setFrom(e.target.value);
              }}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-date-to">Odjezd</label>
            <input
              id="modal-date-to"
              type="date"
              className="form-control"
              value={to}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setTo(e.target.value);
              }}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="purpose-input">Účel návštěvy</label>
            <input
              id="purpose-input"
              type="text"
              className="form-control"
              value={purpose}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setPurpose(e.target.value);
              }}
              placeholder="Víkend, Dovolená…"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes-textarea">
              Poznámka <span className="char-count">{notes.length}/1000</span>
            </label>
            <textarea
              id="notes-textarea"
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setNotes(e.target.value.slice(0, 1000));
              }}
              placeholder="Interní poznámka…"
            />
          </div>

          <div className="form-group">
            <label htmlFor="handover-notes-textarea">
              Vzkaz pro další <span className="char-count">{handover.length}/1000</span>
            </label>
            <textarea
              id="handover-notes-textarea"
              className="form-control"
              rows={3}
              value={handover}
              onChange={(e) => {
                if (submitError) setSubmitError(null);
                setHandover(e.target.value.slice(0, 1000));
              }}
              placeholder="Co necháváš dalším návštěvníkům…"
            />
          </div>

          <div className="form-group form-group--checkbox">
            <label htmlFor="soft-reservation-checkbox">
              <input
                id="soft-reservation-checkbox"
                type="checkbox"
                checked={soft}
                onChange={(e) => {
                  if (submitError) setSubmitError(null);
                  setSoft(e.target.checked);
                }}
              />{" "}
              Předběžná rezervace
            </label>
          </div>
          {submitError ? (
            <div className="error-message show" role="alert">{submitError}</div>
          ) : null}
        </form>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Smazat rezervaci"
        message="Opravdu chcete smazat tuto rezervaci? Tato akce je nevratná."
        confirmLabel="Smazat"
        danger
        loading={deleting}
        errorMessage={deleteError}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteError(null);
        }}
      />
    </Modal>
  );
}
