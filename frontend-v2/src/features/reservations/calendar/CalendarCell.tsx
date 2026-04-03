
import type { Reservation, UserAvailability } from "@/api/reservations";
import styles from "../Reservations.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────

function hexToRgba(hex: string | undefined, alpha = 1): string {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return `rgba(128,128,128,${alpha})`;
  let c = hex.substring(1).split("");
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const n = parseInt(c.join(""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// function isMobile() {
//   return typeof window !== "undefined" && window.innerWidth <= 768;
// }

// ─── Props ────────────────────────────────────────────────────────────

interface CalendarCellProps {
  date: Date;
  dateStr: string;
  isOtherMonth: boolean;
  todayMidnight: Date;
  reservations: Reservation[];
  availabilities: UserAvailability[];
  currentUserId: string;
  rangeStart: string | null;
  rangeHoverDate: string | null;
  onCellClick: (dateStr: string, isOtherMonth: boolean) => void;
  onHover: (dateStr: string) => void;
  onShowDetail: (r: Reservation) => void;
  onShowMonthList: () => void;
  onDaySelect: (dateStr: string) => void;
}

export function CalendarCell({
  date,
  dateStr,
  isOtherMonth,
  todayMidnight,
  reservations,
  availabilities,
  currentUserId: _currentUserId,
  rangeStart,
  rangeHoverDate,
  onCellClick,
  onHover,
  onShowDetail,
  onShowMonthList: _onShowMonthList,
  onDaySelect,
}: CalendarCellProps) {
  const dow = date.getDay();
  const isPast = date < todayMidnight;
  const isToday = date.getTime() === todayMidnight.getTime();

  // ── Range classes ─────────────────────────────────────────────────
  const isRangeStart = rangeStart === dateStr;
  const isInRange =
    !!rangeStart &&
    !!rangeHoverDate &&
    dateStr > rangeStart &&
    dateStr < rangeHoverDate;
  const isRangeEnd =
    !!rangeStart &&
    !!rangeHoverDate &&
    dateStr === rangeHoverDate &&
    dateStr > rangeStart;

  // ── Build className ───────────────────────────────────────────────
  const cls = [
    styles.calDay,
    (dow === 0 || dow === 6) ? styles.weekend : "",
    isOtherMonth ? styles.otherMonth : "",
    isToday ? styles.today : "",
    isPast ? styles.pastDate : "",
    isRangeStart ? styles.rangeStart : "",
    isInRange ? styles.inRange : "",
    isRangeEnd ? styles.rangeEnd : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Reservation bars for this date ────────────────────────────────
  const ts = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  const forDay = reservations.filter((r) => {
    try {
      const s = new Date(r.from + "T00:00:00Z").getTime();
      const e = new Date(r.to + "T00:00:00Z").getTime();
      return ts >= s && ts <= e;
    } catch {
      return false;
    }
  });

  const maxVisible = 1;
  const visible = forDay.slice(0, maxVisible);
  const hiddenCount = forDay.length - visible.length;

  // ── Availability dots ─────────────────────────────────────────────
  const availForDay = availabilities.filter((a) => {
    try {
      const s = new Date(a.startDate + "T00:00:00Z").getTime();
      const e = new Date(a.endDate + "T00:00:00Z").getTime();
      return ts >= s && ts <= e;
    } catch {
      return false;
    }
  });

  // isMobile reserved for responsive adjustments

  return (
    <div
      className={cls}
      data-date={dateStr}
      onClick={() => { onCellClick(dateStr, isOtherMonth); onDaySelect(dateStr); }}
      onMouseEnter={() => { if (!isPast && rangeStart) onHover(dateStr); }}
    >
      <div className={`${styles.dayNum} ${isOtherMonth ? styles.otherMonthDayNum : ""} ${isPast ? styles.pastDateDayNum : ""}`}>
        {date.getDate()}
      </div>

      {/* Reservation bars */}
      {forDay.length > 0 && (
        <div className={styles.calBars}>
          {visible.map((r) => {
            const c = r.userColor || "var(--text-muted)";
            const rTs_s = new Date(r.from + "T00:00:00Z").getTime();
            const rTs_e = new Date(r.to + "T00:00:00Z").getTime();
            const isStart = ts === rTs_s;
            const isEnd = ts === rTs_e;
            const isSingleDay = isStart && isEnd;
            const isMiddle = !isStart && !isEnd;

            const barCls = [
              styles.calBar,
              r.status === "backup" ? styles.calBarBackup : "",
              isSingleDay ? styles.calBarSingle : "",
              !isSingleDay && isStart ? styles.calBarStart : "",
              isMiddle ? styles.calBarMiddle : "",
              !isSingleDay && isEnd ? styles.calBarEnd : "",
              isOtherMonth ? styles.otherMonthBar : "",
            ]
              .filter(Boolean)
              .join(" ");

            const barStyle: React.CSSProperties =
              r.status === "soft"
                ? {
                    background: `repeating-linear-gradient(45deg, ${hexToRgba(r.userColor, 0.15)}, ${hexToRgba(r.userColor, 0.15)} 5px, rgba(255,255,255,0.7) 5px, rgba(255,255,255,0.7) 10px)`,
                    borderColor: c,
                    border: `1px solid ${c}`,
                  }
                : { backgroundColor: hexToRgba(r.userColor, 0.3) };

            // Only show username on the start segment (or single-day)
            const showLabel = isSingleDay || isStart;

            return (
              <div
                key={r.id}
                className={barCls}
                style={barStyle}
                title={`${r.username} (${r.purpose})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDetail(r);
                }}
              >
                {showLabel ? r.username : "\u00A0"}
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <div
              className={styles.calBarMore}
              title={forDay.slice(maxVisible).map((r) => `${r.username} (${r.purpose})`).join(", ")}
              onClick={(e) => {
                e.stopPropagation();
                onDaySelect(dateStr);
              }}
            >
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      {/* Availability bars/icons */}
      {availForDay.length > 0 && (
        <div
          className="absolute bottom-1 right-2 left-2 flex flex-wrap gap-1 pointer-events-none justify-end"
          title={`Mají dovolenou: ${availForDay.map((a) => a.username).join(", ")}`}
        >
          {availForDay.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-center w-5 h-5 rounded-full border border-white/50 shadow-sm text-xs"
              style={{ backgroundColor: hexToRgba(a.userColor || "#cbd5e1", 0.9) }}
            >
              <span>{a.userAnimalIcon || "⛱️"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
