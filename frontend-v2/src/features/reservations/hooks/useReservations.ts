import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import apiClient from "@/api/client";
import { showToast } from "@/lib/toast";
import { handleMutationError } from "@/lib/mutationError";
import type {
  Reservation,
  ReservationUser,
  ReservationsApiResponse,
  MissingSummary,
  CheckoutStatus,
  UserAvailability,
} from "@/api/reservations";

// ─── Query Keys ───────────────────────────────────────────────────────

export const RESERVATIONS_KEY = ["reservations"] as const;
export const USERS_KEY = ["users"] as const;

// ─── Data hooks ───────────────────────────────────────────────────────

export function useReservationsData() {
  return useQuery<ReservationsApiResponse>({
    queryKey: RESERVATIONS_KEY,
    queryFn: () => apiClient.get<ReservationsApiResponse>("/reservations").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useUsers() {
  return useQuery<ReservationUser[]>({
    queryKey: USERS_KEY,
    queryFn: () => apiClient.get<ReservationUser[]>("/users").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

// ─── Booking mutations ────────────────────────────────────────────────

interface BookingPayload {
  from: string;
  to: string;
  purpose: string;
  notes?: string;
  handoverNote?: string;
  status?: "primary" | "soft";
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BookingPayload) =>
      apiClient.post<Reservation>("/reservations", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESERVATIONS_KEY }),
    onError: handleMutationError("Nepodařilo se uložit rezervaci"),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BookingPayload> }) =>
      apiClient.put<Reservation>(`/reservations/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Rezervace upravena.", "success");
    },
    onError: handleMutationError("Nepodařilo se upravit rezervaci"),
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post("/reservations/delete", { id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Rezervace smazána.", "success");
    },
    onError: handleMutationError("Nepodařilo se smazat rezervaci"),
  });
}

export function useAssignReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newOwnerId }: { id: string; newOwnerId: string }) =>
      apiClient.post(`/reservations/${id}/assign`, { newOwnerId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Rezervace přiřazena.", "success");
    },
    onError: handleMutationError("Nepodařilo se přiřadit rezervaci"),
  });
}

// ─── Checkout mutations ───────────────────────────────────────────────

export function useCheckoutReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<CheckoutStatus>(`/reservations/${id}/checkout`).then((r) => r.data),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: RESERVATIONS_KEY });
      const previous = qc.getQueryData<ReservationsApiResponse>(RESERVATIONS_KEY);

      if (previous) {
        qc.setQueryData<ReservationsApiResponse>(RESERVATIONS_KEY, {
          ...previous,
          reservations: previous.reservations.map((r) =>
            r.id === id ? { ...r, isCheckoutCompleted: true, checkoutCompletedAt: new Date().toISOString() } : r
          ),
        });
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(RESERVATIONS_KEY, context.previous);
      }
      // Optimistic rollback done, now show structured toast
      handleMutationError("Nepodařilo se odeslat checklist")(_err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    },
    onSuccess: () => {
      showToast("Odjezdový checklist dokončen ✓", "success");
    },
  });
}

// ─── Availability mutations ───────────────────────────────────────────

interface AvailPayload { startDate: string; endDate: string }

export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvailPayload) =>
      apiClient.post<UserAvailability>("/reservations/availabilities", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Volno nahlášeno!", "success");
    },
    onError: handleMutationError("Nepodařilo se uložit volno"),
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AvailPayload }) =>
      apiClient.patch<UserAvailability>(`/reservations/availabilities/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Volno upraveno!", "success");
    },
    onError: handleMutationError("Nepodařilo se upravit volno"),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/reservations/availabilities/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      showToast("Volno smazáno.", "success");
    },
    onError: handleMutationError("Nepodařilo se smazat volno"),
  });
}

// ─── inventory missing summary ────────────────────────────────────────

export async function fetchMissingSummary(): Promise<MissingSummary | null> {
  try {
    const res = await apiClient.get<MissingSummary>("/inventory/missing-summary");
    return res.data;
  } catch {
    return null;
  }
}

// ─── Watch toggle ─────────────────────────────────────────────────────

export function useWatchReservation() {
  return useMutation({
    mutationFn: ({ id, watching }: { id: string; watching: boolean }) => {
      const method = watching ? "delete" : "post";
      return apiClient[method]<{ watching: boolean; message: string }>(`/reservations/${id}/watch`).then((r) => r.data);
    },
    onSuccess: (data) => showToast(data.message, "success"),
    onError: handleMutationError("Nepodařilo se změnit hlídání"),
  });
}

// ─── Monthly Note ─────────────────────────────────────────────────────

export interface MonthlyNote {
  id?: string;
  year: number;
  month: number;
  text: string;
  updatedBy?: string;
  updatedAt?: string;
}

export const MONTHLY_NOTE_KEY = (year: number, month: number) =>
  ["reservations", "monthly-note", year, month] as const;

export function useMonthlyNote(year: number, month: number) {
  return useQuery<MonthlyNote | null>({
    queryKey: MONTHLY_NOTE_KEY(year, month),
    queryFn: async () => {
      try {
        const response = await apiClient.get<MonthlyNote>(`/reservations/monthly-note`, {
          params: { year, month: month + 1 },
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useUpdateMonthlyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, text }: { year: number; month: number; text: string }) =>
      apiClient.put<MonthlyNote>(`/reservations/monthly-note`, { year, month: month + 1, text })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", "monthly-note"] });
      showToast("Poznámka uložena.", "success");
    },
    onError: handleMutationError("Nepodařilo se uložit poznámku"),
  });
}
