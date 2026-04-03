import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { showToast } from "@/lib/toast";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const BANNER_KEY = "departure_dismissed_date";
const DEFAULT_CHECKLIST = [
  "Uzavřít vodu a plyn",
  "Zkontrolovat okna a dveře",
  "Odnést odpadky",
  "Vytopit nebo nechat vyhasnout krb",
  "Zanechat vzkaz pro příštího návštěvníka",
];

function isDismissedToday(): boolean {
  const stored = sessionStorage.getItem(BANNER_KEY);
  if (!stored) return false;
  return stored === new Date().toISOString().split("T")[0];
}

function dismissToday(): void {
  sessionStorage.setItem(BANNER_KEY, new Date().toISOString().split("T")[0]);
}

interface Props {
  departureChecklist: string[];
  onRefresh: () => void;
}

export function DepartureBanner({ departureChecklist, onRefresh }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(isDismissedToday);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [departureNote, setDepartureNote] = useState("");
  const [incompleteConfirmOpen, setIncompleteConfirmOpen] = useState(false);

  const checklistItems =
    departureChecklist && departureChecklist.length > 0 ? departureChecklist : DEFAULT_CHECKLIST;

  const submitMutation = useMutation({
    mutationFn: async () => {
      let fullMessage = "**Odjezd z chaty:**\n";
      checklistItems.forEach((item, i) => {
        fullMessage += checkedItems[i] ? `- [x] ${item}\n` : `- [ ] ${item}\n`;
      });
      if (departureNote.trim()) {
        fullMessage += `\n**Vzkaz:** ${departureNote.trim()}`;
      }
      await apiClient.post("/channels/messages", { message: fullMessage });
    },
    onSuccess: () => {
      dismissToday();
      setDismissed(true);
      setModalOpen(false);
      showToast("Odjezdový protokol byl uložen.", "success");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onRefresh();
    },
    onError: () => {
      showToast("Nepodařilo se uložit odjezdový protokol.", "error");
    },
  });

  if (dismissed) return null;

  const openModal = () => {
    setCheckedItems(new Array(checklistItems.length).fill(false));
    setDepartureNote("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = () => {
    const allChecked = checkedItems.every(Boolean);
    if (!allChecked) {
      setIncompleteConfirmOpen(true);
      return;
    }
    submitMutation.mutate();
  };

  const handleConfirmedSubmit = () => {
    setIncompleteConfirmOpen(false);
    submitMutation.mutate();
  };

  const toggleItem = (i: number) => {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <>
      <ConfirmDialog
        isOpen={incompleteConfirmOpen}
        title="Neúplný checklist"
        message="Některé položky nejsou odškrtnuté. Opravdu chcete protokol odeslat?"
        confirmLabel="Odeslat"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setIncompleteConfirmOpen(false)}
      />
      {/* Departure banner — inserted at top of dashboard grid */}
      <div id="departure-banner" className="departure-banner">
        <div className="departure-banner-content">
          <div className="departure-banner-icon" aria-hidden="true">⚠</div>
          <div className="departure-banner-text">
            <h3>Dnes odjíždíte!</h3>
            <p>Nezapomeňte vyplnit odjezdový protokol a nechat vzkaz.</p>
          </div>
        </div>
        <button id="btn-open-departure" className="button-primary departure-banner-action" onClick={openModal}>
          Vyplnit protokol
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Odjezdový protokol"
        footer={
          <button
            className="button-primary"
            style={{ width: "100%" }}
            disabled={submitMutation.isPending}
            onClick={handleSubmit}
          >
            {submitMutation.isPending ? "Odesílám…" : "Odeslat a uzavřít pobyt"}
          </button>
        }
      >
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12, fontSize: '0.9rem' }}>
          Před odjezdem, prosím, zkontrolujte:
        </p>
        <div className="departure-checklist">
          {checklistItems.map((item, i) => (
            <label key={i} className="checklist-item">
              <input
                type="checkbox"
                checked={checkedItems[i] ?? false}
                onChange={() => toggleItem(i)}
              />
              {" "}
              {item}
            </label>
          ))}
        </div>
        <div className="form-group" style={{ marginTop: 15 }}>
          <label>Vzkaz dalšímu návštěvníkovi (a na nástěnku):</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Např.: Vše ok, dřevo je připravené pod plachtou..."
            value={departureNote}
            onChange={(e) => setDepartureNote(e.target.value)}
          />
        </div>
      </Modal>
      <div style={{ display: "none" }} onClick={() => navigate("/reservations")} />
    </>
  );
}
