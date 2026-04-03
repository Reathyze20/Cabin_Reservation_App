import { useNavigate } from "react-router-dom";
import type { DashboardReservationsData, UpcomingReservation, ActiveReservation as ActiveRes } from "@/api/dashboard";
import { formatDateRange, formatWeekendRange, nightsBetween, nightsLabel, daysUntil, getTodayFormatted } from "@/lib/dateUtils";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";

interface Props {
  data: DashboardReservationsData;
  cabinDepartureChecklist: string[];
}

function isValidReservation(r: { from: string; to: string } | null | undefined): boolean {
  if (!r) return false;
  return !!r.from && !!r.to;
}

function buildNextBlock(res: UpcomingReservation | null): React.ReactNode {
  if (!res) return null;
  const days = daysUntil(res.from);
  const daysChip = days === 0 ? "dnes" : days === 1 ? "zítra" : `za ${days} d.`;
  return (
    <div className="status-next-block">
      <div className="status-next-avatar">
        <AnimalAvatar icon={res.userAnimalIcon} username={res.username} color={res.userColor || undefined} size={36} />
      </div>
      <div className="status-next-info">
        <div className="status-next-label">Další pobyt</div>
        <div className="status-next-name">{res.username}</div>
        <div className="status-next-date">{formatDateRange(res.from, res.to)}</div>
      </div>
      <span className="status-next-chip">{daysChip}</span>
    </div>
  );
}

export function ActiveReservation({ data, cabinDepartureChecklist }: Props) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const formattedDate = getTodayFormatted();
  const active = data.activeReservation;

  const validUpcoming = data.upcomingReservations.filter((r) => isValidReservation(r) && r.status === "primary");
  const nextRes = active
    ? (validUpcoming.find((r) => r.id !== active.id) ?? null)
    : (validUpcoming[0] ?? null);

  const freeWeekendNode = data.nextFreeWeekend ? (
    <div className="next-free-weekend">
      <span className="free-weekend-dot" /> Nejbližší volný víkend:{" "}
      <strong>{formatWeekendRange(data.nextFreeWeekend.start, data.nextFreeWeekend.end)}</strong>
    </div>
  ) : null;

  const dateNode = <div className="dashboard-date">{formattedDate}</div>;
  const hasCheckoutTasks = cabinDepartureChecklist && cabinDepartureChecklist.length > 0;

  // ── Stav C: Occupied ─────────────────────────────────────────────────
  if (active && isValidReservation(active)) {
    const departingToday = active.to === todayStr;
    const userColor = active.userColor || "#ea580c";

    let title: string;
    let subtitle: string;
    let cardClass: string;
    let avatarNode: React.ReactNode;
    let badgePill: React.ReactNode;
    let remainingChip: React.ReactNode = null;
    let checkoutReminderNode: React.ReactNode = null;

    if (departingToday && currentHour >= 14) {
      title = "Volná!";
      subtitle = `Dnes odjel${active.username.endsWith("a") ? "a" : ""} ${active.username} · ${active.purpose}`;
      cardClass = "glass-card status-card is-free";
      avatarNode = (
        <div className="status-avatar-block" style={{ background: "var(--color-primary)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </div>
      );
      badgePill = <div className="status-badge-pill"><span className="status-dot" /> Volná</div>;
      if (hasCheckoutTasks) {
        checkoutReminderNode = active.isCheckoutCompleted
          ? <div className="checkout-reminder checkout-reminder-done">✅ Odjezdový checklist splněn</div>
          : <div className="checkout-reminder checkout-reminder-missed">⚠ Odjezdový checklist nebyl vyplněn</div>;
      }
    } else if (departingToday) {
      title = `Dnes odjíždí ${active.username}`;
      subtitle = `${formatDateRange(active.from, active.to)} · ${active.purpose}`;
      cardClass = "glass-card status-card is-occupied";
      avatarNode = <div className="status-avatar-block"><AnimalAvatar icon={active.userAnimalIcon} username={active.username} color={userColor} size={48} /></div>;
      badgePill = <div className="status-badge-pill"><span className="status-dot" /> Odjezd dnes</div>;
      if (hasCheckoutTasks) {
        checkoutReminderNode = active.isCheckoutCompleted
          ? <div className="checkout-reminder checkout-reminder-done">✅ Odjezdový checklist splněn</div>
          : (
            <div className="checkout-reminder checkout-reminder-warn">
              <span className="checkout-reminder-icon">📋</span>{" "}
              <span>Před odjezdem vyplňte <a href="/reservations">odjezdový checklist</a></span>
            </div>
          );
      }
    } else {
      const nights = nightsBetween(todayStr, active.to);
      title = active.username;
      subtitle = `${formatDateRange(active.from, active.to)} · ${active.purpose}`;
      cardClass = "glass-card status-card is-occupied";
      avatarNode = <div className="status-avatar-block"><AnimalAvatar icon={active.userAnimalIcon} username={active.username} color={userColor} size={48} /></div>;
      badgePill = <div className="status-badge-pill"><span className="status-dot" /> Obsazeno</div>;
      if (nights > 0) {
        remainingChip = <span className="status-remaining-chip">Zbývá {nights} {nightsLabel(nights)}</span>;
      }
    }

    return (
      <div className={cardClass} id="dashboard-active-reservation" style={{ "--status-user-color": userColor } as React.CSSProperties}>
        <div className="card-body-full status-content">
          {dateNode}
          <div className="status-hero-row">
            {avatarNode}
            <div className="status-hero-text">
              <div className="status-name-row">
                <div className="status-name">{title}</div>
                {badgePill}
              </div>
              <div className="status-meta">
                <span className="status-dates">{subtitle}</span>
                {remainingChip}
              </div>
            </div>
          </div>
          {checkoutReminderNode}
          {buildNextBlock(nextRes)}
          <div className="status-cta-row">
            {freeWeekendNode}
            <a href="/reservations" onClick={(e) => { e.preventDefault(); navigate("/reservations"); }} className="status-cta status-cta-neutral">
              Kalendář rezervací
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Stav B: Free, but upcoming reservation exists ────────────────────
  if (nextRes) {
    return (
      <div className="glass-card status-card is-free" id="dashboard-active-reservation">
        <div className="card-body-full status-content">
          {dateNode}
          <div className="status-hero-row">
            <div className="status-avatar-block" style={{ background: "var(--color-primary)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div className="status-hero-text">
              <div className="status-name-row">
                <div className="status-name">Volná!</div>
                <div className="status-badge-pill"><span className="status-dot" /> Volná</div>
              </div>
              <div className="status-meta">
                <span className="status-dates">Žádný aktuální pobyt</span>
              </div>
            </div>
          </div>
          {buildNextBlock(nextRes)}
          <div className="status-cta-row">
            {freeWeekendNode}
            <a href="/reservations" onClick={(e) => { e.preventDefault(); navigate("/reservations"); }} className="status-cta status-cta-neutral">
              Kalendář rezervací
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Stav A: Free, nothing planned ────────────────────────────────────
  return (
    <div className="glass-card status-card is-free is-available" id="dashboard-active-reservation">
      <div className="card-body-full status-content">
        {dateNode}
        <div className="status-hero-row">
          <div className="status-avatar-block" style={{ background: "var(--color-primary)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div className="status-hero-text">
            <div className="status-name-row">
              <div className="status-name">Volná!</div>
              <div className="status-badge-pill"><span className="status-dot" /> Volná</div>
            </div>
            <div className="status-meta">
              <span className="status-dates">Žádný plánovaný pobyt. Ideální čas vyrazit.</span>
            </div>
          </div>
        </div>
        <div className="status-cta-row">
          {freeWeekendNode}
          <button className="status-cta status-cta-primary" onClick={() => navigate("/reservations")}>
            Zarezervovat termín
          </button>
        </div>
      </div>
    </div>
  );
  void (active as ActiveRes | null);
}
