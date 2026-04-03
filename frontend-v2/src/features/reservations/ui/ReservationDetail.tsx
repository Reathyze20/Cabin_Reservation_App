import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import type { Reservation } from "@/api/reservations";
import { CheckoutSection } from "./CheckoutSection";
import { useAuth } from "@/context/AuthContext";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";
import { escapeHtml } from "@/lib/utils";
import styles from "../Reservations.module.css";

const MONTH_NAMES_GEN = [
  "Ledna", "Února", "Března", "Dubna", "Května", "Června",
  "Července", "Srpna", "Září", "Října", "Listopadu", "Prosince",
];

function formatDateFull(date: string): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return `${d.getDate()}. ${MONTH_NAMES_GEN[d.getMonth()]}`;
}

interface WatchStatus { watching: boolean }

interface Props {
  reservation: Reservation;
  onBack: () => void;
  onEdit: (r: Reservation) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string) => void;
}

export function ReservationDetail({ reservation: r, onBack, onEdit, onDelete, onAssign }: Props) {
  const { user } = useAuth();
  const isMine = r.userId === user?.userId;
  const isAdmin = user?.role === "admin";
  const canEdit = isMine || isAdmin;
  const c = r.userColor || "var(--text-muted)";

  // Ethical friction: two-phase delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Night count for timeline
  const nightCount = r.from && r.to
    ? Math.round((new Date(r.to + "T00:00:00").getTime() - new Date(r.from + "T00:00:00").getTime()) / 86400000)
    : 0;

  const statusMap: Record<string, { label: string; cls: string }> = {
    primary: { label: "Potvrzeno", cls: styles.badgeSuccess },
    backup:  { label: "Záložní",   cls: styles.badgeWarning },
    soft:    { label: "Předběžná", cls: styles.badgeNeutral },
  };
  const badge = statusMap[r.status ?? "primary"] ?? statusMap["primary"];

  // Watch status
  const { data: watchData, refetch: refetchWatch } = useQuery<WatchStatus>({
    queryKey: ["watch", r.id],
    queryFn: () => apiClient.get<WatchStatus>(`/reservations/${r.id}/watch`).then((res) => res.data),
    enabled: !isMine,
  });

  const handleWatchToggle = async (watching: boolean) => {
    const method = watching ? "delete" : "post";
    await apiClient[method](`/reservations/${r.id}/watch`);
    await refetchWatch();
  };

  const handleDeleteClick = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 4000);
    } else {
      onDelete(r.id);
      setDeleteConfirm(false);
    }
  };

  return (
    <div className={styles.detailCard}>
      {/* ── Header: User left, Badge right ── */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <AnimalAvatar
            icon={r.userAnimalIcon}
            username={r.username}
            color={c}
            size={44}
            className={styles.detailAvatar}
          />
          <span className={styles.detailColorDot} style={{ backgroundColor: c }} />
          <strong className={styles.detailUserName}>{r.username}</strong>
        </div>
        <span className={badge.cls}>{badge.label}</span>
      </div>

      {/* ── Timeline Widget ── */}
      <div className={styles.timelineBlock}>
        <div className={styles.timeline}>
          <div className={styles.timelineColLeft}>
            <span className={styles.timelineLabel}>Příjezd</span>
            <span className={styles.timelineDateBold}>{formatDateFull(r.from)}</span>
          </div>
          <div className={styles.timelineCenter}>
            <div className={styles.timelineLine} />
            <span className={styles.timelinePill}>
              {nightCount} {nightCount === 1 ? "noc" : nightCount < 5 ? "noci" : "nocí"} 🌙
            </span>
          </div>
          <div className={styles.timelineColRight}>
            <span className={styles.timelineLabel}>Odjezd</span>
            <span className={styles.timelineDateBold}>{formatDateFull(r.to)}</span>
          </div>
        </div>
      </div>

      {/* ── Data Fields (hidden if empty) ── */}
      {r.purpose && (
        <div className={styles.detailField}>
          <span className={styles.detailFieldLabel}>Účel</span>
          <span className={styles.detailFieldValue}>{r.purpose}</span>
        </div>
      )}
      {r.notes && (
        <div className={styles.detailField}>
          <span className={styles.detailFieldLabel}>Poznámka</span>
          <span
            className={styles.detailFieldValueMuted}
            dangerouslySetInnerHTML={{ __html: escapeHtml(r.notes) }}
          />
        </div>
      )}
      {r.handoverNote && (
        <div className={styles.detailField}>
          <span className={styles.detailFieldLabel}>Vzkaz pro další</span>
          <span
            className={styles.detailFieldValueMuted}
            dangerouslySetInnerHTML={{ __html: escapeHtml(r.handoverNote) }}
          />
        </div>
      )}

      {/* ── Checkout ── */}
      <CheckoutSection reservation={r} />

      {/* ── Action Bar (footer) ── */}
      <div className={styles.actionBar}>
        <div className={styles.actionLeft}>
          <button className={styles.btnGhost} onClick={onBack}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Zpět
          </button>
          {canEdit && (
            <button
              className={deleteConfirm ? styles.deleteConfirmBtn : styles.btnGhostDanger}
              onClick={handleDeleteClick}
            >
              {deleteConfirm ? "Opravdu smazat?" : "Smazat"}
            </button>
          )}
        </div>
        <div className={styles.actionRight}>
          {!isMine && (
            watchData?.watching ? (
              <button className={styles.btnOutline} onClick={() => handleWatchToggle(true)}>
                🐕 Zrušit
              </button>
            ) : (
              <button className={styles.btnOutline} title="Dostaneš zprávu, pokud bude termín uvolněn" onClick={() => handleWatchToggle(false)}>
                Hlídat
              </button>
            )
          )}
          {canEdit && isAdmin && (
            <button className={styles.btnOutline} onClick={() => onAssign(r.id)}>
              Přiřadit
            </button>
          )}
          {canEdit && (
            <button className={styles.btnPrimary} onClick={() => onEdit(r)}>
              Upravit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
