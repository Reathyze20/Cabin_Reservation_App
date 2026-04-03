import { useState, useEffect } from "react";
import apiClient from "@/api/client";
import type { Reservation, CheckoutStatus } from "@/api/reservations";
import { useCheckoutReservation } from "../hooks/useReservations";
import { showToast } from "@/lib/toast";
import styles from "../Reservations.module.css";

/** Returns true if reservation is active or was active in the last ~day */
function isReservationActiveOrRecent(r: Reservation): boolean {
  if (!r.from || !r.to) return false;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const from = new Date(r.from + "T00:00:00");
  const to = new Date(r.to + "T00:00:00");
  return from <= now && to >= yesterday;
}

interface Props {
  reservation: Reservation;
}

export function CheckoutSection({ reservation }: Props) {
  const isPrimary = reservation.status === "primary";
  const eligible = isPrimary && isReservationActiveOrRecent(reservation);
  const checkout = useCheckoutReservation();

  const [tasks, setTasks] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [completedStatus, setCompletedStatus] = useState<CheckoutStatus | null>(null);

  useEffect(() => {
    if (!eligible) return;
    if (reservation.isCheckoutCompleted) {
      apiClient
        .get<CheckoutStatus>(`/reservations/${reservation.id}/checkout`)
        .then((res) => setCompletedStatus(res.data))
        .catch(() => {});
    } else {
      setLoading(true);
      apiClient
        .get<{ checkoutTasks?: string[] }>("/cabin")
        .then((res) => {
          setTasks(res.data.checkoutTasks ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [eligible, reservation.id, reservation.isCheckoutCompleted]);

  if (!eligible) return null;

  // --- Completed state ---
  if (reservation.isCheckoutCompleted && completedStatus) {
    const ts = completedStatus.checkoutCompletedAt
      ? new Date(completedStatus.checkoutCompletedAt)
      : null;
    const formatted = ts
      ? `${ts.getDate()}.${ts.getMonth() + 1}.${ts.getFullYear()} ${ts.getHours().toString().padStart(2, "0")}:${ts.getMinutes().toString().padStart(2, "0")}`
      : "";
    return (
      <div className={styles.checkoutSection}>
        <div className={styles.checkoutCompleted}>
          <div className={styles.checkoutCompletedIcon}>✓</div>
          <div className={styles.checkoutCompletedText}>
            <strong>Odjezd potvrzen</strong>
            {formatted && <span className={styles.checkoutCompletedDate}>{formatted}</span>}
          </div>
        </div>
      </div>
    );
  }

  // --- No tasks ---
  if (!loading && tasks.length === 0) {
    return (
      <div className={styles.checkoutSection}>
        <div className={styles.emptyTasksBox}>Bez výjezdových úkolů.</div>
      </div>
    );
  }

  // --- Form state ---
  const allChecked = tasks.length > 0 && checked.size === tasks.length;

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!allChecked) return;
    try {
      await checkout.mutateAsync(reservation.id);
      showToast("Odjezd potvrzen! Díky 🐕", "success");
    } catch {
      showToast("Chyba při potvrzení odjezdu.", "error");
    }
  };

  return (
    <div className={styles.checkoutSection}>
      <div>
        <h4 className={styles.checkoutTitle}>Výjezdový protokol</h4>
        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <p className={styles.checkoutProgress}>
              Splněno <span className={styles.checkoutProgressBold}>{checked.size}</span> z{" "}
              <span className={styles.checkoutProgressBold}>{tasks.length}</span> úkolů
            </p>
            <div className={styles.checkoutTasksList}>
              {tasks.map((task, i) => (
                <label key={i} className={styles.checkoutTaskItem}>
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggle(i)}
                  />
                  <span>{task}</span>
                </label>
              ))}
            </div>
            <button
              className={styles.checkoutConfirmBtn}
              disabled={!allChecked || checkout.isPending}
              onClick={handleConfirm}
            >
              {checkout.isPending ? "Ukládám…" : "Potvrdit odjezd"}
            </button>
            {!allChecked && tasks.length > 0 && (
              <p className={styles.checkoutHint}>Potvrď všechny úkoly pro odeslání.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
