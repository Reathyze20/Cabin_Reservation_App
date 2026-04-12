/**
 * ReservationsPage.tsx — Refactored: CSS Modules + Skeletons + Empty States + Ethical Friction
 *
 * Layout:
 *   Left  — CalendarGrid + QuickStats
 *   Right — ReservationList | ReservationDetail
 */
import { useState, useEffect } from "react";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Umbrella, Home } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useReservationsData, fetchMissingSummary, useDeleteReservation } from "./hooks/useReservations";
import { useCalendar } from "./hooks/useCalendar";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { QuickStats } from "./ui/QuickStats";
import { ReservationList } from "./ui/ReservationList";
import { ReservationDetail } from "./ui/ReservationDetail";
import { BookingForm } from "./ui/BookingForm";
import { AvailabilityModal } from "./ui/AvailabilityModal";
import { InventoryNotifyDialog } from "./ui/InventoryNotifyDialog";
import { ReservationsSkeleton } from "./ui/ReservationsSkeleton";
import type { Reservation, MissingSummary } from "@/api/reservations";
import { showToast } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { FeatureErrorFallback } from "@/components/shared/FeatureErrorFallback";
import { Modal } from "@/components/shared/Modal";
import styles from "./Reservations.module.css";

/** Filter reservations that intersect with the given calendar month */
function filterByMonth(reservations: Reservation[], month: number, year: number) {
  const mStart = Date.UTC(year, month, 1);
  const mEndDate = new Date(year, month + 1, 0);
  const mEnd = Date.UTC(mEndDate.getFullYear(), mEndDate.getMonth(), mEndDate.getDate());

  return reservations.filter((r) => {
    if (!r.from || !r.to) return false;
    const [fy, fm, fd] = r.from.split("-").map(Number);
    const [ty, tm, td] = r.to.split("-").map(Number);
    const rFrom = Date.UTC(fy, fm - 1, fd);
    const rTo   = Date.UTC(ty, tm - 1, td);
    return rFrom <= mEnd && rTo >= mStart;
  });
}

/** Filter reservations that haven't ended yet */
function filterFuture(reservations: Reservation[]) {
  const now = new Date();
  const todayTs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return reservations.filter((r) => {
    if (!r.to) return false;
    const [ty, tm, td] = r.to.split("-").map(Number);
    return Date.UTC(ty, tm - 1, td) >= todayTs;
  });
}

export function ReservationsPage() {
  useDocumentTitle('Rezervace');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const cal = useCalendar();

  const { data, isLoading } = useReservationsData();
  const del = useDeleteReservation();

  const allReservations: Reservation[] = data?.reservations ?? [];
  const allAvailabilities = data?.availabilities ?? [];
  const myAvailabilities = allAvailabilities.filter((a) => a.userId === user?.userId);

  // Detail view
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Day filter — set when a calendar day is clicked
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const handleDaySelect = (dateStr: string) => {
    setSelectedDay((prev) => prev === dateStr ? null : dateStr);
    setSelectedReservation(null);
  };

  // Booking modal
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingFrom, setBookingFrom] = useState("");
  const [bookingTo, setBookingTo]     = useState("");
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  // Range Choice Modal
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [choiceFrom, setChoiceFrom] = useState("");
  const [choiceTo, setChoiceTo] = useState("");

  // Availability modal
  const [availOpen, setAvailOpen]   = useState(false);
  const [availFrom, setAvailFrom]   = useState("");
  const [availTo, setAvailTo]       = useState("");

  // Inventory notify dialog
  const [invSummary, setInvSummary]   = useState<MissingSummary | null>(null);
  const [invDialogOpen, setInvDialogOpen] = useState(false);

  // Auto-open booking form from query params (e.g. ?from=2026-04-17&to=2026-04-18)
  useEffect(() => {
    const qFrom = searchParams.get("from");
    const qTo = searchParams.get("to");
    if (qFrom && qTo && /^\d{4}-\d{2}-\d{2}$/.test(qFrom) && /^\d{4}-\d{2}-\d{2}$/.test(qTo)) {
      setBookingFrom(qFrom);
      setBookingTo(qTo);
      setEditingReservation(null);
      setBookingOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Escape → clear calendar range selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") cal.clearRange();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cal]);

  // Open choice modal to decide between Reservation or Availability
  const handleRangeComplete = (from: string, to: string) => {
    setEditingReservation(null);
    setChoiceFrom(from);
    setChoiceTo(to);
    setChoiceOpen(true);
  };

  const handleCreateReservation = () => {
    setChoiceOpen(false);
    setBookingFrom(choiceFrom);
    setBookingTo(choiceTo);
    setBookingOpen(true);
  };

  const handleCreateAvailability = () => {
    setChoiceOpen(false);
    setAvailFrom(choiceFrom);
    setAvailTo(choiceTo);
    setAvailOpen(true);
  };

  // Open availability modal from calendar button
  const handleAvailabilityClick = () => {
    setAvailFrom("");
    setAvailTo("");
    setAvailOpen(true);
  };

  // After successful reservation create → check inventory
  const handleReservationCreated = async (_: string) => {
    showToast("Rezervace uložena! Kontroluji zásoby…", "info");
    const summary = await fetchMissingSummary();
    if (!summary || (summary.count === 0 && !summary.hasShoppingItems)) {
      showToast("Rezervace uložena! Zásoby jsou v pořádku.", "success");
      return;
    }
    setInvSummary(summary);
    setInvDialogOpen(true);
  };

  // Edit from detail or list
  const handleEdit = (r: Reservation) => {
    setEditingReservation(r);
    setBookingFrom(r.from ?? "");
    setBookingTo(r.to ?? "");
    setBookingOpen(true);
  };

  // Delete reservation (called from detail — ethical friction is handled there)
  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      showToast("Rezervace smazána.", "success");
      setSelectedReservation(null);
    } catch {
      showToast("Chyba při mazání rezervace.", "error");
    }
  };

  // Assign from detail/list
  const handleAssign = (_: string) => {
    showToast("Funkce přiřazení bude brzy dostupná.", "info");
  };

  // ── Skeleton while loading ────────────────────────────────────────────
  if (isLoading) {
    return <ReservationsSkeleton />;
  }

  // ── Filtered list for right panel ─────────────────────────────────────
  const monthFiltered = filterByMonth(allReservations, cal.month, cal.year);
  const futureReservations = filterFuture(allReservations);

  // If a specific day is selected, narrow down to reservations covering that day
  const filtered = selectedDay
    ? monthFiltered.filter((r) => {
        const ts = new Date(selectedDay + "T00:00:00Z").getTime();
        const s  = new Date(r.from + "T00:00:00Z").getTime();
        const e  = new Date(r.to   + "T00:00:00Z").getTime();
        return ts >= s && ts <= e;
      })
    : monthFiltered;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.layout}>
      {/* ── Left: Calendar ── */}
      <ErrorBoundary
        FallbackComponent={(props) => (
          <FeatureErrorFallback {...props} title="Kalendář rezervací se nepodařilo načíst" />
        )}
      >
        <CalendarGrid
          month={cal.month}
          year={cal.year}
          reservations={allReservations}
          availabilities={allAvailabilities}
          currentUserId={user?.userId ?? ""}
          rangeStart={cal.rangeStart}
          onGoToPrev={cal.goToPrev}
          onGoToNext={cal.goToNext}
          onRangeComplete={handleRangeComplete}
          onShowMonthList={handleAvailabilityClick}
          onRangeClear={cal.clearRange}
          onRangeStartSet={cal.setRangeStart}
          onShowDetail={setSelectedReservation}
          onDaySelect={handleDaySelect}
          showCreateButton={filtered.length > 0 || !!selectedReservation}
          quickStatsNode={
            <QuickStats
              reservations={allReservations}
              month={cal.month}
              year={cal.year}
            />
          }
        />
      </ErrorBoundary>

      {/* ── Right: Sidebar ── */}
      <div className={styles.listContainer}>
        <div className={styles.listScroll}>
          {selectedReservation ? (
            <ReservationDetail
              reservation={selectedReservation}
              onBack={() => setSelectedReservation(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssign={handleAssign}
            />
          ) : (
            <ReservationList
              reservations={filtered}
              allReservations={allReservations}
              futureReservations={futureReservations}
              month={cal.month}
              year={cal.year}
              onMonthChange={(m, y) => { cal.goToMonth(m, y); setSelectedDay(null); }}
              onShowDetail={setSelectedReservation}
              selectedDay={selectedDay}
              onClearDayFilter={() => setSelectedDay(null)}
              onNewReservation={() => {
                setEditingReservation(null);
                setBookingFrom("");
                setBookingTo("");
                setBookingOpen(true);
              }}
            />
          )}
         </div>
       </div>

      {/* ── Modals ── */}
      <BookingForm
        open={bookingOpen}
        onClose={() => { setBookingOpen(false); setEditingReservation(null); }}
        fromDate={bookingFrom}
        toDate={bookingTo}
        existing={editingReservation}
        allReservations={allReservations}
        onCreated={handleReservationCreated}
      />

      <AvailabilityModal
        open={availOpen}
        onClose={() => setAvailOpen(false)}
        fromDate={availFrom}
        toDate={availTo}
        myAvailabilities={myAvailabilities}
      />
      <Modal
        isOpen={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        title="Vybraný termín"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <p className="text-slate-600 text-sm">
            Co byste chtěli v tomto termínu naplánovat?
          </p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleCreateReservation}
              className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800">
                <Home size={20} />
              </div>
              <div>
                <div className="font-semibold text-emerald-900">Rezervovat chatu</div>
                <div className="text-xs text-emerald-700">Vytvořit pevnou rezervaci pro pobyt</div>
              </div>
            </button>
            <button
              onClick={handleCreateAvailability}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                <Umbrella size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Označit jako mou dovolenou</div>
                <div className="text-xs text-slate-500">Dát ostatním vědět, že mám volno</div>
              </div>
            </button>
          </div>
        </div>
      </Modal>
      <InventoryNotifyDialog
        open={invDialogOpen}
        summary={invSummary}
        onConfirm={() => { setInvDialogOpen(false); navigate("/shopping"); }}
        onClose={() => setInvDialogOpen(false)}
      />
    </div>
  );
}
