import { useNavigate } from "react-router-dom";
import type { DashboardReservationsData, UpcomingReservation, LastStay } from "@/api/dashboard";
import { formatDateRange, formatWeekendRange, nightsBetween, daysUntil, getTodayFormatted } from "@/lib/dateUtils";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";
import { CalendarPlus } from "lucide-react";

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
  const dLabel = days === 1 ? "den" : days >= 2 && days <= 4 ? "dny" : "dní";
  const daysChip = days === 0 ? "dnes" : days === 1 ? "zítra" : `za ${days} ${dLabel}`;
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

function buildLastStayBlock(lastStay: LastStay | null | undefined): React.ReactNode {
  if (!lastStay) return null;
  const daysLabel = lastStay.daysEmpty === 0 ? "dnes" :
    lastStay.daysEmpty === 1 ? "1 den" :
    lastStay.daysEmpty < 5 ? `${lastStay.daysEmpty} dny` :
    `${lastStay.daysEmpty} dní`;
  const isLongEmpty = lastStay.daysEmpty >= 14;
  const checklistPart = lastStay.isCheckoutCompleted
    ? " · Checklist OK"
    : lastStay.daysEmpty > 0 ? " · Checklist nevyplněn" : "";
  return (
    <div className={`last-stay-inline${isLongEmpty ? " last-stay-warning" : ""}`}>
      <span className="last-stay-text">
        Prázdná {daysLabel}{checklistPart}
      </span>
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

  // Up to 3 upcoming reservations (excluding active)
  const upcomingList = active
    ? validUpcoming.filter((r) => r.id !== active.id).slice(0, 3)
    : validUpcoming.slice(0, 3);

  const freeWeekendNode = data.nextFreeWeekend ? (
    <button 
      className="status-cta status-cta-smart" 
      onClick={() => navigate(`/reservations?from=${data.nextFreeWeekend!.start}&to=${data.nextFreeWeekend!.end}`)}
    >
      <CalendarPlus size={14} /> Volný víkend {formatWeekendRange(data.nextFreeWeekend.start, data.nextFreeWeekend.end)}
    </button>
  ) : null;

  const dateNode = <div className="dashboard-date">{formattedDate}</div>;
  const hasCheckoutTasks = cabinDepartureChecklist && cabinDepartureChecklist.length > 0;

  const myNext = data.myNextReservation;
  const myNextDays = myNext ? daysUntil(myNext.from) : null;
  const isMyNextSameAsNext = myNext && nextRes && myNext.from === nextRes.from && myNext.to === nextRes.to;
  const isMyNextSameAsActive = myNext && active && myNext.from === active.from && myNext.to === active.to;

  function buildCombinedNextBlock(): React.ReactNode {
    if (!nextRes) return null;
    const days = daysUntil(nextRes.from);
    const daysChip = days === 0 ? "dnes" : days === 1 ? "zítra" : `za ${days} dní`;

    if (isMyNextSameAsNext && myNext) {
      const label = days === 0 ? "Váš pobyt začíná dnes" : days === 1 ? "Váš pobyt začíná zítra" : `Váš pobyt ${daysChip}`;
      return (
        <div className="status-next-block status-next-personal">
          <div className="status-next-accent-line"></div>
          <div className="status-next-avatar">
            <AnimalAvatar icon={nextRes.userAnimalIcon} username={nextRes.username} color={nextRes.userColor || undefined} size={36} />
          </div>
          <div className="status-next-info">
            <div className="status-next-label status-next-label-personal">{label}</div>
            <div className="status-next-date">{formatDateRange(nextRes.from, nextRes.to)}{myNext.purpose ? ` · ${myNext.purpose}` : ""}</div>
          </div>
        </div>
      );
    }

    return (
      <>
        {myNext && !isMyNextSameAsNext && !isMyNextSameAsActive && (() => {
          const label = myNextDays === 0 ? "Váš pobyt začíná dnes" : myNextDays === 1 ? "Váš pobyt začíná zítra" : `Váš pobyt za ${myNextDays} dní`;
          return (
            <div className="status-next-block status-next-personal">
              <div className="status-next-accent-line"></div>
              <div className="status-next-info" style={{ marginLeft: 6 }}>
                <div className="status-next-label status-next-label-personal">{label}</div>
                <div className="status-next-date">{formatDateRange(myNext.from, myNext.to)} · {myNext.purpose}</div>
              </div>
            </div>
          );
        })()}
        {buildNextBlock(nextRes)}
      </>
    );
  }

  function buildUpcomingList(): React.ReactNode {
    if (upcomingList.length === 0) return null;
    const rest = nextRes ? upcomingList.filter((r) => r.id !== nextRes.id) : upcomingList;
    if (rest.length === 0) return null;

    return (
      <div className="status-upcoming-list">
        {rest.map((r) => {
          const days = daysUntil(r.from);
          const daysChip = days === 0 ? "dnes" : days === 1 ? "zítra" : `za ${days} dní`;
          const isMyRes = myNext && r.from === myNext.from && r.to === myNext.to;
          return (
            <div className={`status-upcoming-row${isMyRes ? " status-upcoming-mine" : ""}`} key={r.id}>
              <AnimalAvatar icon={r.userAnimalIcon} username={r.username} color={r.userColor || undefined} size={28} />
              <div className="status-upcoming-info">
                <span className="status-upcoming-name">{r.username}</span>
                <span className="status-upcoming-date">{formatDateRange(r.from, r.to)}</span>
              </div>
              <span className="status-upcoming-chip">{daysChip}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Stav C: Occupied ─────────────────────────────────────────────────
  if (active && isValidReservation(active)) {
    const departingToday = active.to === todayStr;
    const userColor = active.userColor || "#ea580c";

    let title: string;
    let subtitle: string;
    let cardClass: string;
    let avatarNode: React.ReactNode;
    let checkoutReminderNode: React.ReactNode = null;

    if (departingToday && currentHour >= 14) {
      title = "Volná!";
      subtitle = `Dnes uvolnil${active.username.endsWith("a") ? "a" : ""} ${active.username} · ${active.purpose}`;
      cardClass = "glass-card status-card is-free";
      avatarNode = (
        <div className="status-avatar-block" style={{ background: "var(--color-primary)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </div>
      );
      if (hasCheckoutTasks) {
        checkoutReminderNode = active.isCheckoutCompleted
          ? <div className="checkout-reminder checkout-reminder-done">✓ Odjezdový checklist splněn</div>
          : <div className="checkout-reminder checkout-reminder-missed">⚠ Odjezdový checklist nebyl vyplněn</div>;
      }
    } else if (departingToday) {
      title = active.username;
      subtitle = `Odjíždí dnes · ${active.purpose}`;
      cardClass = "glass-card status-card is-occupied";
      avatarNode = <div className="status-avatar-block"><AnimalAvatar icon={active.userAnimalIcon} username={active.username} color={userColor} size={48} /></div>;
      if (hasCheckoutTasks) {
        checkoutReminderNode = active.isCheckoutCompleted
          ? <div className="checkout-reminder checkout-reminder-done">Odjezdový checklist splněn</div>
          : (
            <div className="checkout-reminder checkout-reminder-warn">
              <span>Před odjezdem vyplňte <a href="/reservations">odjezdový checklist</a></span>
            </div>
          );
      }
    } else {
      const nights = nightsBetween(todayStr, active.to);
      const dLabel = nights === 1 ? "1 den" : nights >= 2 && nights <= 4 ? `${nights} dny` : `${nights} dní`;
      title = active.username;
      
      const toDate = new Date(active.to);
      const formattedToObj = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" }).format(toDate);
      const formattedTo = formattedToObj.split(' ').map(w => w === 'Zítra' ? w : w).join(' ');

      // Subtitle e.g.: "Pobyt do pátku 17. 4. (ještě 5 dní) · Test"
      subtitle = `Pobyt do ${formattedTo} (ještě ${dLabel}) · ${active.purpose}`;
      cardClass = "glass-card status-card is-occupied";
      avatarNode = <div className="status-avatar-block"><AnimalAvatar icon={active.userAnimalIcon} username={active.username} color={userColor} size={48} /></div>;
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
              </div>
              <div className="status-meta">
                <span className="status-dates">{subtitle}</span>
              </div>
            </div>
          </div>
          {checkoutReminderNode}
          {buildCombinedNextBlock()}
          {buildUpcomingList()}
          <div className="status-cta-row">
            {freeWeekendNode}
            <button onClick={() => navigate("/reservations")} className="status-cta status-cta-neutral">
              Kalendář
            </button>
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
                <div className="status-name">Nyní volná</div>
              </div>
            </div>
          </div>
          {buildCombinedNextBlock()}
          {buildUpcomingList()}
          {buildLastStayBlock(data.lastStay)}
          <div className="status-cta-row">
            {freeWeekendNode}
            <button onClick={() => navigate("/reservations")} className="status-cta status-cta-neutral">
              Kalendář
            </button>
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
              <div className="status-name">Chata je volná!</div>
            </div>
            <div className="status-meta">
              <span className="status-dates">Žádný plánovaný pobyt. Ideální čas vyrazit.</span>
            </div>
          </div>
        </div>
        {buildLastStayBlock(data.lastStay)}
        {buildCombinedNextBlock()}
        {buildUpcomingList()}
        <div className="status-cta-row">
          {freeWeekendNode}
          <button className="status-cta status-cta-primary" onClick={() => navigate("/reservations")}>
            Nová rezervace
          </button>
        </div>
      </div>
    </div>
  );
}
