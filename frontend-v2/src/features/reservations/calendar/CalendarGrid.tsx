import { useMemo, useState } from "react";
import { getDaysInMonth, getDay, format } from "date-fns";
import { CalendarCell } from "./CalendarCell";
import type { Reservation, UserAvailability } from "@/api/reservations";
import styles from "../Reservations.module.css";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];
const MONTH_NAMES_GENITIVE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];
const WEEKDAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const TOTAL_CELLS = 42;

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Format "2026-03-21" → "21. března" */
function formatCzechDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}. ${MONTH_NAMES_GENITIVE[d.getMonth()]}`;
}

interface CalendarGridProps {
  month: number;
  year: number;
  reservations: Reservation[];
  availabilities: UserAvailability[];
  currentUserId: string;
  rangeStart: string | null;
  onGoToPrev: () => void;
  onGoToNext: () => void;
  onRangeStartSet: (date: string) => void;
  onRangeClear: () => void;
  onRangeComplete: (from: string, to: string) => void;
  onShowDetail: (r: Reservation) => void;
  onShowMonthList: () => void;
  onDaySelect: (dateStr: string) => void;
  quickStatsNode?: React.ReactNode;
  /** Hide the "Vytvořit rezervaci" button when EmptyState CTA is visible in the right panel */
  showCreateButton?: boolean;
}

export function CalendarGrid({
  month,
  year,
  reservations,
  availabilities,
  currentUserId,
  rangeStart,
  onGoToPrev,
  onGoToNext,
  onRangeStartSet,
  onRangeClear,
  onRangeComplete,
  onShowDetail,
  onShowMonthList,
  onDaySelect,
  quickStatsNode,
  showCreateButton: _showCreateButton = true,
}: CalendarGridProps) {
  const [rangeHoverDate, setRangeHoverDate] = useState<string | null>(null);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const totalDays = getDaysInMonth(firstOfMonth);
    let startOffset = getDay(firstOfMonth) - 1;
    if (startOffset === -1) startOffset = 6;

    const items: { date: Date; isOtherMonth: boolean }[] = [];

    for (let i = 0; i < startOffset; i++) {
      const dayNum = new Date(year, month, 0).getDate() - startOffset + i + 1;
      items.push({ date: new Date(year, month - 1, dayNum), isOtherMonth: true });
    }

    for (let d = 1; d <= totalDays; d++) {
      items.push({ date: new Date(year, month, d), isOtherMonth: false });
    }

    const trailing = TOTAL_CELLS - items.length;
    for (let d = 1; d <= trailing; d++) {
      items.push({ date: new Date(year, month + 1, d), isOtherMonth: true });
    }

    return items;
  }, [month, year]);

  const todayMidnight = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const handleCellClick = (dateStr: string, isOtherMonth: boolean) => {
    const date = new Date(dateStr + "T00:00:00");
    if (date < todayMidnight) return;

    if (!rangeStart) {
      if (isOtherMonth) return;
      onRangeStartSet(dateStr);
    } else {
      if (dateStr === rangeStart) {
        onRangeClear();
        setRangeHoverDate(null);
      } else if (dateStr < rangeStart) {
        if (isOtherMonth) return;
        onRangeClear();
        setRangeHoverDate(null);
        onRangeStartSet(dateStr);
      } else {
        const start = rangeStart;
        onRangeClear();
        setRangeHoverDate(null);
        onRangeComplete(start, dateStr);
      }
    }
  };

  const handleHover = (dateStr: string) => {
    if (rangeStart && dateStr > rangeStart) {
      setRangeHoverDate(dateStr);
    }
  };

  const handleGridMouseLeave = () => {
    setRangeHoverDate(null);
  };

  return (
    <div className={styles.calendarCard}>
      {/* Header */}
      <div className={styles.calendarHeaderBar}>
        <div className={styles.calendarNav}>
          <button className={styles.iconButton} onClick={onGoToPrev}>❮</button>
          <h2 className={styles.calendarTitle}>
            {MONTH_NAMES[month]} {year}
          </h2>
          <button className={styles.iconButton} onClick={onGoToNext}>❯</button>
        </div>
        <div className={styles.calendarStats}>
          {quickStatsNode}
        </div>
      </div>

      {/* Calendar grid */}
      <div className={styles.calendarGrid}>
        <div className={styles.calWeekdays}>
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className={styles.calWeekday}>{d}</div>
          ))}
        </div>
        <div
          className={rangeStart ? styles.calDaysSelecting : styles.calDays}
          onMouseLeave={handleGridMouseLeave}
        >
          {cells.map(({ date, isOtherMonth }) => {
            const dateStr = toDateStr(date);
            return (
              <CalendarCell
                key={dateStr + (isOtherMonth ? "-o" : "")}
                date={date}
                dateStr={dateStr}
                isOtherMonth={isOtherMonth}
                todayMidnight={todayMidnight}
                reservations={reservations}
                availabilities={availabilities}
                currentUserId={currentUserId}
                rangeStart={rangeStart}
                rangeHoverDate={rangeHoverDate}
                onCellClick={handleCellClick}
                onHover={handleHover}
                onShowDetail={onShowDetail}
                onShowMonthList={onShowMonthList}
                onDaySelect={onDaySelect}
              />
            );
          })}
        </div>
      </div>

      {/* Range hint + action buttons */}
      <div className={styles.panelActions}>
        <div className={rangeStart ? styles.rangeHint : styles.rangeHintHidden}>
          <div className={styles.rangeHintIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className={styles.rangeHintBody}>
            <strong>
              {rangeStart
                ? `Příjezd: ${formatCzechDate(rangeStart)} — vyberte odjezd`
                : "Vyberte datum odjezdu"}
            </strong>
            <span>Klikněte na den v kalendáři</span>
          </div>
          <button
            type="button"
            className={styles.rangeHintCancel}
            title="Zrušit výběr"
            onClick={() => { onRangeClear(); setRangeHoverDate(null); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.panelActionsButtons}>
          
        </div>
      </div>
    </div>
  );
}
