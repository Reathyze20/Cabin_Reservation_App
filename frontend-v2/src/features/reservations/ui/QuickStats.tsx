import { useMemo } from "react";
import type { Reservation } from "@/api/reservations";
import styles from "../Reservations.module.css";

interface Props {
  reservations: Reservation[];
  month: number;
  year: number;
}

export function QuickStats({ reservations, month, year }: Props) {
  const stats = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const occupiedDays = new Set<number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reservations.forEach((r) => {
      if (r.status === "backup") return;
      const start = new Date(r.from + "T00:00:00");
      const end = new Date(r.to + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getFullYear() === year && cur.getMonth() === month) {
          occupiedDays.add(cur.getDate());
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    let futureOccupied = 0;
    let futureFree = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate < today) continue;
      if (occupiedDays.has(d)) { futureOccupied++; } else { futureFree++; }
    }

    let freeWeekends = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      if (date.getDay() !== 6) continue;
      if (date < today) continue;
      const satFree = !occupiedDays.has(d);
      if (d + 1 <= daysInMonth && satFree && !occupiedDays.has(d + 1)) freeWeekends++;
    }

    return { futureOccupied, futureFree, freeWeekends };
  }, [reservations, month, year]);

  return (
    <>
      <span className={`${styles.statBadge} ${styles.statBadgeOccupied}`}>
        Obsazeno: <strong>{stats.futureOccupied}</strong>
      </span>
      <span className={`${styles.statBadge} ${styles.statBadgeFree}`}>
        Volno: <strong>{stats.futureFree}</strong>
      </span>
      <span className={`${styles.statBadge} ${styles.statBadgeWeekend}`}>
        Volné víkendy: <strong>{stats.freeWeekends}</strong>
      </span>
    </>
  );
}
