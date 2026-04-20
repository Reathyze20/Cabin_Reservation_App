import { useState, useEffect } from "react";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import apiClient from "@/api/client";
import { fetchWeather } from "@/api/dashboard";
import type { CabinSettings, DashboardActivationData, DashboardReservationsData, DashboardShoppingData, DashboardNotesData, DashboardReconstructionData } from "@/api/dashboard";
import { DashboardActivationSchema, DashboardReservationsSchema, DashboardShoppingSchema, DashboardNotesSchema, DashboardReconstructionSchema } from "@/api/schemas";
import { WeatherCard } from "./WeatherCard";
import { ActiveReservation } from "./ActiveReservation";
import { AdminActivationChecklist } from "./AdminActivationChecklist";
import { ShoppingWidget } from "./ShoppingWidget";
import { HandoverNote } from "./HandoverNote";
import { EssentialWarning } from "./EssentialWarning";
import { DepartureBanner } from "./DepartureBanner";
import { ReconstructionWidget } from "./ReconstructionWidget";
import { FeatureErrorFallback } from "@/components/shared/FeatureErrorFallback";
import { motion } from "framer-motion";

// ─── Skeletons ────────────────────────────────────────────────────────

export function StatusCardSkeleton() {
  return (
    <div className="glass-card status-card" id="dashboard-active-reservation">
      <div className="card-body-full status-content">
        <div className="status-split-row">
          <div className="skeleton skeleton-avatar-lg" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, justifyContent: "center" }}>
            <div className="skeleton skeleton-text short" style={{ width: 50, height: 11 }} />
            <div className="skeleton skeleton-text" style={{ width: "52%", height: 18 }} />
            <div className="skeleton skeleton-text" style={{ width: "72%", height: 13 }} />
          </div>
        </div>
        <div className="status-cta-row" style={{ marginTop: 14, gap: 8 }}>
          <div className="skeleton skeleton-btn" style={{ width: 160 }} />
          <div className="skeleton skeleton-btn" style={{ width: 130 }} />
        </div>
      </div>
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="glass-card weather-card" id="dashboard-weather">
      <div className="card-body-full">
        <div className="weather-main">
          <div className="weather-current" style={{ gap: 16 }}>
            <div className="skeleton skeleton-weather-icon" />
            <div className="weather-temp-box" style={{ gap: 8 }}>
              <div className="skeleton skeleton-temp" />
              <div className="skeleton skeleton-text" style={{ width: 90, height: 13 }} />
            </div>
          </div>
          <div className="weather-details" style={{ gap: 8 }}>
            <div className="skeleton skeleton-text" style={{ width: 80, height: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: 72, height: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: 88, height: 12 }} />
          </div>
        </div>
        <div className="weather-divider" style={{ opacity: 0.4 }} />
        <div className="weather-forecast">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-forecast-col">
              <div className="skeleton skeleton-text" style={{ width: 28, height: 11 }} />
              <div className="skeleton" style={{ width: 22, height: 22, borderRadius: "50%" }} />
              <div className="skeleton skeleton-text" style={{ width: 36, height: 13 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShoppingSkeleton() {
  return (
    <div className="glass-card">
      <div className="card-body-full" id="dashboard-shopping">
        <div className="dashboard-card-header">
          <div className="skeleton skeleton-text" style={{ width: 100, height: 14 }} />
          <div className="skeleton skeleton-text" style={{ width: 70, height: 13 }} />
        </div>
        <div className="list-content" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="skeleton skeleton-avatar-sm" />
              <div className="skeleton skeleton-text" style={{ height: 13, flex: 1 }} />
              <div className="skeleton skeleton-badge" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HandoverNoteSkeleton() {
  return (
    <div className="glass-card dashboard-handover-card" id="dashboard-handover-note">
      <div className="card-body-full handover-card-content">
        <div className="dashboard-card-header">
          <div className="skeleton skeleton-text" style={{ width: 60, height: 14 }} />
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <div className="skeleton skeleton-text long" style={{ height: 13 }} />
          <div className="skeleton skeleton-text" style={{ width: "78%", height: 13 }} />
          <div className="skeleton skeleton-text medium" style={{ height: 13 }} />
        </div>
      </div>
    </div>
  );
}

export function ReconstructionSkeleton() {
  return (
    <div className="glass-card">
      <div className="card-body-full">
        <div className="dashboard-card-header">
          <div className="skeleton skeleton-text" style={{ width: 70, height: 14 }} />
          <div className="skeleton skeleton-text" style={{ width: 40, height: 13 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <div className="skeleton" style={{ width: 40, height: 28, borderRadius: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 100, height: 13 }} />
        </div>
        {[0, 1].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 6 }} />
            <div className="skeleton skeleton-text" style={{ flex: 1, height: 13 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivationChecklistSkeleton() {
  return (
    <div className="glass-card dashboard-activation-inline-card">
      <div className="card-body-full dashboard-activation-inline-content">
        <div className="dashboard-activation-inline-main">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: 120, height: 14 }} />
                <div className="skeleton skeleton-text" style={{ width: "56%", height: 18 }} />
              </div>
              <div className="skeleton" style={{ width: 76, height: 56, borderRadius: 14, flexShrink: 0 }} />
            </div>
            <div className="skeleton skeleton-text long" style={{ height: 13 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[0, 1, 2].map((index) => (
                <div key={index} className="skeleton" style={{ width: 108, height: 30, borderRadius: 999 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div className="skeleton skeleton-btn" style={{ width: 154 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animation variants ───────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

// ─── DashboardPage ────────────────────────────────────────────────────

export function DashboardPage() {
  useDocumentTitle('Přehled');
  const { isAdmin } = useAuth();
  const [handoverNote, setHandoverNote] = useState<string | null>(null);
  const [handoverNoteAuthor, setHandoverNoteAuthor] = useState<string | null>(null);
  const [handoverNoteUpdatedAt, setHandoverNoteUpdatedAt] = useState<string | null>(null);

  // Cabin info
  const cabinQuery = useQuery<CabinSettings>({
    queryKey: ["cabin"],
    queryFn: () => apiClient.get<CabinSettings>("/cabin").then((r) => r.data),
    staleTime: 60_000,
  });

  // Independent queries for each domain
  const reservationsQuery = useQuery<DashboardReservationsData>({
    queryKey: ["dashboard", "reservations"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardReservationsData>("/dashboard/reservations");
      return DashboardReservationsSchema.parse(data) as DashboardReservationsData;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30_000,
  });

  const activationQuery = useQuery<DashboardActivationData>({
    queryKey: ["dashboard", "activation"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardActivationData>("/dashboard/activation");
      return DashboardActivationSchema.parse(data) as DashboardActivationData;
    },
    enabled: isAdmin,
    staleTime: 5_000,
    refetchOnMount: "always",
  });

  const shoppingQuery = useQuery<DashboardShoppingData>({
    queryKey: ["dashboard", "shopping"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardShoppingData>("/dashboard/shopping");
      return DashboardShoppingSchema.parse(data) as DashboardShoppingData;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30_000,
  });

  const notesQuery = useQuery<DashboardNotesData>({
    queryKey: ["dashboard", "notes"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardNotesData>("/dashboard/notes");
      return DashboardNotesSchema.parse(data) as DashboardNotesData;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30_000,
  });

  // Sync handover note initially
  useEffect(() => {
    if (notesQuery.data) {
      setHandoverNote(prev => prev === null ? notesQuery.data.pinnedHandoverNote : prev);
      setHandoverNoteAuthor(prev => prev === null ? notesQuery.data.handoverNoteAuthor : prev);
      setHandoverNoteUpdatedAt(prev => prev === null ? notesQuery.data.handoverNoteUpdatedAt : prev);
    }
  }, [notesQuery.data]);

  // Weather is fetched client-side using cabin's weatherLocation
  const weatherQuery = useQuery({
    queryKey: ["weather", cabinQuery.data?.weatherLocation ?? null],
    queryFn: () => fetchWeather(cabinQuery.data?.weatherLocation),
    enabled: cabinQuery.isSuccess,
    staleTime: 10 * 60 * 1000,
  });

  const reconstructionQuery = useQuery<DashboardReconstructionData>({
    queryKey: ["dashboard", "reconstruction"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardReconstructionData>("/dashboard/reconstruction");
      return DashboardReconstructionSchema.parse(data) as DashboardReconstructionData;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30_000,
  });

  const cabinError = cabinQuery.isError;
  const isWinterized = !!cabinQuery.data?.isWinterized;
  const departureChecklist = cabinQuery.data?.departureChecklist ?? [];

  return (
    <div className="dashboard nordic-dashboard">
      {/* Winter banner */}
      {isWinterized && (
        <div id="dashboard-winter-banner" className="winter-banner">
          <div className="winter-banner-content">
            <span className="winter-banner-icon">*</span>
            <div className="winter-banner-text">
              <strong>Chata je zazimovaná</strong>
              <span>Mrazové výstrahy a speciální režim jsou aktivní</span>
            </div>
          </div>
        </div>
      )}

      {/* Cabin error banner */}
      {cabinError && (
        <div className="essential-warning-banner" style={{ borderLeftColor: 'var(--status-warning)' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠</span>
          <span>Nepodařilo se načíst nastavení chaty — některé widgety nemusí fungovat správně.</span>
        </div>
      )}

      {/* Warnings & Banners */}
      {shoppingQuery.isSuccess && shoppingQuery.data?.essentialWarning && (
        <EssentialWarning warning={shoppingQuery.data.essentialWarning} />
      )}

      {reservationsQuery.isSuccess && reservationsQuery.data?.departingToday && (
        <DepartureBanner
          departureChecklist={departureChecklist}
          onRefresh={() => reservationsQuery.refetch()}
        />
      )}

      {/* Main grid */}
      <motion.div
        className="dashboard-grid"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Row 1, Col 1: Reservation Card */}
        <motion.div variants={cardVariants}>
          {reservationsQuery.isLoading ? (
            <StatusCardSkeleton />
          ) : reservationsQuery.isError ? (
            <ErrorBoundary FallbackComponent={(props) => <FeatureErrorFallback {...props} title="Rezervace se nepodařilo načíst" />}>
              <FeatureErrorFallback title="Rezervace se nepodařilo načíst" error={reservationsQuery.error as Error} resetErrorBoundary={() => reservationsQuery.refetch()} />
            </ErrorBoundary>
          ) : reservationsQuery.data ? (
            <ActiveReservation data={reservationsQuery.data} cabinDepartureChecklist={departureChecklist} />
          ) : null}
        </motion.div>

        {/* Row 1, Col 2: Weather Card */}
        <motion.div variants={cardVariants}>
          {weatherQuery.isLoading || cabinQuery.isLoading ? (
            <WeatherSkeleton />
          ) : weatherQuery.isError ? (
            <ErrorBoundary FallbackComponent={(props) => <FeatureErrorFallback {...props} title="Počasí se nepodařilo načíst" />}>
              <FeatureErrorFallback title="Počasí se nepodařilo načíst" error={weatherQuery.error as Error} resetErrorBoundary={() => weatherQuery.refetch()} />
            </ErrorBoundary>
          ) : (
            <WeatherCard weather={weatherQuery.data ?? null} />
          )}
        </motion.div>

        {/* Row 1, Col 3: Shopping Widget */}
        <motion.div variants={cardVariants}>
          {shoppingQuery.isLoading ? (
            <ShoppingSkeleton />
          ) : shoppingQuery.isError ? (
            <ErrorBoundary FallbackComponent={(props) => <FeatureErrorFallback {...props} title="Nákupy se nepodařilo načíst" />}>
              <FeatureErrorFallback title="Nákupy se nepodařilo načíst" error={shoppingQuery.error as Error} resetErrorBoundary={() => shoppingQuery.refetch()} />
            </ErrorBoundary>
          ) : shoppingQuery.data ? (
            <ShoppingWidget
              items={shoppingQuery.data.pendingShoppingItems}
              totalCount={shoppingQuery.data.totalPendingShoppingCount}
              totalItemsCount={shoppingQuery.data.totalItemsCount}
            />
          ) : null}
        </motion.div>

        {/* Row 2, Col 1: Handover Note */}
        <motion.div variants={cardVariants}>
          {notesQuery.isLoading ? (
            <HandoverNoteSkeleton />
          ) : notesQuery.isError ? (
            <ErrorBoundary FallbackComponent={(props) => <FeatureErrorFallback {...props} title="Nástěnku se nepodařilo načíst" />}>
              <FeatureErrorFallback title="Nástěnku se nepodařilo načíst" error={notesQuery.error as Error} resetErrorBoundary={() => notesQuery.refetch()} />
            </ErrorBoundary>
          ) : notesQuery.data ? (
            <HandoverNote
              note={handoverNote}
              author={handoverNoteAuthor}
              updatedAt={handoverNoteUpdatedAt}
              onNoteUpdate={(newNote, author, updatedAt) => {
                setHandoverNote(newNote);
                setHandoverNoteAuthor(author ?? null);
                setHandoverNoteUpdatedAt(updatedAt ?? null);
              }}
            />
          ) : null}
        </motion.div>

        {/* Row 2, Col 2: Reconstruction Widget */}
        <motion.div variants={cardVariants}>
          {reconstructionQuery.isLoading ? (
            <ReconstructionSkeleton />
          ) : reconstructionQuery.isError ? (
            <ErrorBoundary FallbackComponent={(props) => <FeatureErrorFallback {...props} title="Údržbu se nepodařilo načíst" />}>
              <FeatureErrorFallback title="Údržbu se nepodařilo načíst" error={reconstructionQuery.error as Error} resetErrorBoundary={() => reconstructionQuery.refetch()} />
            </ErrorBoundary>
          ) : reconstructionQuery.data ? (
            <ReconstructionWidget data={reconstructionQuery.data} />
          ) : null}
        </motion.div>
      </motion.div>

      {isAdmin && (activationQuery.isLoading ? (
        <motion.div variants={cardVariants}>
          <ActivationChecklistSkeleton />
        </motion.div>
      ) : activationQuery.isSuccess && activationQuery.data?.shouldShow ? (
        <motion.div variants={cardVariants}>
          <ErrorBoundary fallbackRender={() => null}>
            <AdminActivationChecklist data={activationQuery.data} />
          </ErrorBoundary>
        </motion.div>
      ) : null)}
    </div>
  );
}
