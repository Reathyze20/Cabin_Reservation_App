import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, ChevronDown, PenLine } from "lucide-react";
import type { Reservation } from "@/api/reservations";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/shared/Modal";
import { useMonthlyNote, useUpdateMonthlyNote } from "../hooks/useReservations";
import { AnimalAvatar } from "@/components/shared/AnimalAvatar";
import css from "../Reservations.module.css";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const MONTH_NAMES_GENITIVE = [
  "lednu", "únoru", "březnu", "dubnu", "květnu", "červnu",
  "červenci", "srpnu", "září", "říjnu", "listopadu", "prosinci",
];

const NOTE_MAX_LENGTH = 180;

// ── Month/year picker dropdown ──────────────────────────────────────
function MonthPicker({
  month,
  year,
  onSelect,
  onClose,
}: {
  month: number;
  year: number;
  onSelect: (m: number, y: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pickerYear, setPickerYear] = useState(year);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 mt-2 z-30 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-64"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded transition-colors"
          onClick={() => setPickerYear((y) => y - 1)}
        >
          ‹
        </button>
        <span className="font-bold text-slate-800">{pickerYear}</span>
        <button
          type="button"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded transition-colors"
          onClick={() => setPickerYear((y) => y + 1)}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, i) => {
          const isActive = i === month && pickerYear === year;
          return (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(i, pickerYear); onClose(); }}
              className={`text-xs font-medium py-1.5 px-1 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────

interface Props {
  reservations: Reservation[];
  allReservations?: Reservation[];
  futureReservations?: Reservation[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  onShowDetail: (r: Reservation) => void;
  onNewReservation: () => void;
  selectedDay?: string | null;
  onClearDayFilter?: () => void;
}

function formatDayChip(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function ReservationList({
  reservations,
  futureReservations = [],
  month,
  year,
  onMonthChange,
  onShowDetail,
  onNewReservation,
  selectedDay,
  onClearDayFilter,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "upcoming">("month");

  // Reset view to month when user navigates to a different month
  const prevMonthRef = useRef(`${year}-${month}`);
  useEffect(() => {
    const key = `${year}-${month}`;
    if (prevMonthRef.current !== key) {
      prevMonthRef.current = key;
      setViewMode("month");
    }
  }, [year, month]);

  const { data: monthlyNote } = useMonthlyNote(year, month);
  const updateNote = useUpdateMonthlyNote();

  const sourceList = viewMode === "upcoming" ? futureReservations : reservations;

  const sorted = useMemo(
    () => [...sourceList].sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()),
    [sourceList],
  );

  const openNoteModal = () => {
    setNoteText(monthlyNote?.text ?? "");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    try {
      await updateNote.mutateAsync({ year, month, text: noteText.trim() });
      setNoteModalOpen(false);
    } catch { /* onError in hook */ }
  };

  const handlePrevMonth = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };

  const handleNextMonth = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── A. Compact month navigator ── */}
      <div className="relative">
        <div className={css.monthNav}>
          <button type="button" className={css.monthNavArrow} onClick={handlePrevMonth} aria-label="Předchozí měsíc">‹</button>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className={css.monthNavLabel}
          >
            {MONTH_NAMES[month]} {year}
            <ChevronDown
              size={14}
              className={`${css.monthNavChevron} ${pickerOpen ? css.monthNavChevronOpen : ""}`}
            />
          </button>
          <button type="button" className={css.monthNavArrow} onClick={handleNextMonth} aria-label="Další měsíc">›</button>
        </div>
        <AnimatePresence>
          {pickerOpen && (
            <MonthPicker
              month={month}
              year={year}
              onSelect={onMonthChange}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── B. Separator ── */}
      <div className={css.statsSection} />

      {/* ── C. View mode tab toggle ── */}
      {!selectedDay && (
        <div className={css.viewTabs}>
          <button
            type="button"
            className={`${css.viewTab} ${viewMode === "month" ? css.viewTabActive : ""}`}
            onClick={() => setViewMode("month")}
          >
            {MONTH_NAMES[month]} {year}
          </button>
          <button
            type="button"
            className={`${css.viewTab} ${viewMode === "upcoming" ? css.viewTabActive : ""}`}
            onClick={() => setViewMode("upcoming")}
          >
            Nadcházející
          </button>
        </div>
      )}

      {/* Day filter chip */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            key="day-chip"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={css.dayFilterChip}
          >
            <span className={css.dayFilterChipText}>
              Rezervace pro {formatDayChip(selectedDay)}
            </span>
            <button
              type="button"
              className={css.dayFilterChipClose}
              onClick={onClearDayFilter}
              aria-label="Zrušit filtr dne"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}-${viewMode}`}
            className={css.cardList}
          >
            {sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={css.emptyState}
              >
                <img src="/empty_cabin.svg" alt="Chata je volná" className={css.emptyIllustration} />
                <div className={css.emptyTextBlock}>
                  <h3 className={css.emptyTitle}>Chata je volná!</h3>
                  <p className={css.emptyText}>
                    {viewMode === "upcoming"
                      ? "Nejsou naplánovány žádné nadcházející pobyty."
                      : "V tomto měsíci nejsou naplánovány žádné pobyty."}
                  </p>
                </div>
              </motion.div>
            ) : (
              sorted.map((r, i) => <ReservationCard key={r.id} reservation={r} index={i} onClick={onShowDetail} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── D. Monthly note ── */}
      <div className={css.noteSection}>
        <div className={css.noteHeader}>
          <h4 className={css.sectionHeading} style={{ margin: 0 }}>
            Poznámka k {MONTH_NAMES_GENITIVE[month]}
          </h4>
          <button
            type="button"
            onClick={openNoteModal}
            className={`${css.btnReset} ${css.noteEditBtn}`}
            title="Upravit poznámku"
          >
            <PenLine size={16} />
          </button>
        </div>
        <div className={css.noteBox} onClick={openNoteModal}>
          {monthlyNote?.text ? (
            <p>&ldquo;{monthlyNote.text}&rdquo;</p>
          ) : (
            <p className={css.notePlaceholder}>Přidat vzkaz k tomuto měsíci pro ostatní…</p>
          )}
        </div>
      </div>

      {/* ── E. Create reservation button ── */}
      <button
        type="button"
        onClick={onNewReservation}
        className={`${css.ctaButton} ${css.ctaButtonLayout}`}
      >
        <span className={css.ctaIcon}>
          <Plus size={18} strokeWidth={2.5} />
        </span>
        Vytvořit rezervaci
      </button>

      {/* ── Note edit modal ── */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title={`Poznámka k měsíci — ${MONTH_NAMES[month]} ${year}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className={`text-xs ${noteText.length > NOTE_MAX_LENGTH ? "text-red-500 font-bold" : "text-slate-400"}`}>
              {noteText.length}/{NOTE_MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => setNoteModalOpen(false)}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={noteText.length > NOTE_MAX_LENGTH || updateNote.isPending}
                onClick={handleSaveNote}
              >
                {updateNote.isPending ? "Ukládám…" : "Uložit"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Tuto poznámku uvidí všichni členové chaty. Můžete ji kdykoliv upravit.
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            maxLength={NOTE_MAX_LENGTH + 20}
            rows={3}
            placeholder={'Např. „V březnu přijede instalatér 15.–16., buďte prosím doma."'}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
          />
        </div>
      </Modal>
    </div>
  );
}

// ── Reservation card sub-component ──────────────────────────────────

function ReservationCard({
  reservation: r,
  index,
  onClick,
}: {
  reservation: Reservation;
  index: number;
  onClick: (r: Reservation) => void;
}) {
  const uColor = r.userColor || "#94a3b8";
  const d1 = new Date(r.from + "T00:00:00");
  const d2 = new Date(r.to + "T00:00:00");
  const isPast = d2 < new Date();

  const dateLabel = `${d1.getDate()}. ${d1.getMonth() + 1}. – ${d2.getDate()}. ${d2.getMonth() + 1}.`;

  let badgeClass = css.badgeConfirmed;
  let statusLabel = "Potvrzeno";
  if (r.status === "backup") {
    badgeClass = css.badgeBackup;
    statusLabel = "Záložní";
  } else if (r.status === "soft") {
    badgeClass = css.badgePending;
    statusLabel = "Čeká";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: index * 0.07 }}
      className={`${css.card} ${isPast ? css.cardPast : ""}`}
      onClick={() => onClick(r)}
    >
      {/* Avatar */}
      <AnimalAvatar
        icon={r.userAnimalIcon}
        username={r.username}
        color={uColor}
        size={52}
        className={css.cardAvatar}
      />

      {/* Content */}
      <div className={css.cardContent}>
        <div className={css.cardTopRow}>
          <span className={css.cardTitle}>
            {r.purpose || "Bez názvu"}
          </span>
          <span className={badgeClass}>
            {statusLabel}
          </span>
        </div>
        <div className={css.cardMeta}>
          <span>{dateLabel}</span>
          <span className={css.cardMetaDot}>&bull;</span>
          <span className={css.cardMetaName}>{r.username}</span>
        </div>
      </div>
    </motion.div>
  );
}
