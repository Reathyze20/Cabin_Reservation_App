import type { MissingSummary } from "@/api/reservations";
import { Modal } from "@/components/shared/Modal";

interface Props {
  open: boolean;
  summary: MissingSummary | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function InventoryNotifyDialog({ open, summary, onConfirm, onClose }: Props) {
  if (!open || !summary) return null;

  const parts: string[] = [];
  if (summary.count > 0) parts.push(`${summary.count} chybějících položek v zásobách`);
  if (summary.hasShoppingItems) parts.push("nedokončené nákupní seznamy");

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="  Zkontroluj zásoby"
      maxWidth="max-w-sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button className="btn-secondary" onClick={onClose}>Ne, díky</button>
          <button className="btn-primary" onClick={onConfirm}>Přejít na nákupy</button>
        </div>
      }
    >
      <p>
        Máš: <strong>{parts.join(" a ")}</strong>.
        <br />
        Chceš přejít na nákupní seznam?
      </p>
    </Modal>
  );
}
