import { useState } from "react";

export interface CalendarState {
  month: number;   // 0–11
  year: number;
  rangeStart: string | null; // YYYY-MM-DD
}

export interface UseCalendarReturn extends CalendarState {
  goToPrev: () => void;
  goToNext: () => void;
  goToMonth: (month: number, year: number) => void;
  setRangeStart: (date: string | null) => void;
  clearRange: () => void;
}

export function useCalendar(): UseCalendarReturn {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [rangeStart, setRangeStartState] = useState<string | null>(null);

  const goToPrev = () => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };

  const goToNext = () => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  const goToMonth = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
  };

  const clearRange = () => setRangeStartState(null);

  return { month, year, rangeStart, goToPrev, goToNext, goToMonth, setRangeStart: setRangeStartState, clearRange };
}
