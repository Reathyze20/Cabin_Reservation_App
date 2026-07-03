/**
 * hooks/useRealtimeSync.ts — Napojení Socket.io eventů na TanStack Query cache.
 * Při každé změně dat na serveru invaliduje příslušný query klíč,
 * čímž ostatní přihlášení uživatelé vidí aktuální data bez ručního obnovení.
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from './useSocket'

export function useRealtimeSync() {
  const { user } = useAuth()
  const { on, off, socketGeneration } = useSocket()
  const qc = useQueryClient()

  useEffect(() => {
    if (!user) return

    function handleReservationChange() {
      void qc.invalidateQueries({ queryKey: ['reservations'] })
    }

    function handleMessageCreated(data: { threadId?: string | null }) {
      const threadId = data?.threadId ?? null
      void qc.invalidateQueries({ queryKey: ['channels', threadId ?? '__main__'] })
      void qc.invalidateQueries({ queryKey: ['channels'] })
    }

    function handleMessageUpdated(data: { threadId?: string | null }) {
      const threadId = data?.threadId ?? null
      void qc.invalidateQueries({ queryKey: ['channels', threadId ?? '__main__'] })
    }

    function handleMessageDeleted(data: { threadId?: string | null }) {
      const threadId = data?.threadId ?? null
      void qc.invalidateQueries({ queryKey: ['channels', threadId ?? '__main__'] })
      void qc.invalidateQueries({ queryKey: ['channels'] })
    }

    function handleMessageReaction(data: { threadId?: string | null }) {
      const threadId = data?.threadId ?? null
      void qc.invalidateQueries({ queryKey: ['channels', threadId ?? '__main__'] })
    }

    function handleShoppingChange() {
      void qc.invalidateQueries({ queryKey: ['shopping-lists'] })
    }

    function handleReconstructionChange() {
      void qc.invalidateQueries({ queryKey: ['reconstruction'] })
    }

    on('reservation:created', handleReservationChange)
    on('reservation:updated', handleReservationChange)
    on('reservation:deleted', handleReservationChange)
    on('message:created', handleMessageCreated)
    on('message:updated', handleMessageUpdated)
    on('message:deleted', handleMessageDeleted)
    on('message:reaction', handleMessageReaction)
    on('note:created', handleMessageCreated)
    on('shopping:item:added', handleShoppingChange)
    on('shopping:item:updated', handleShoppingChange)
    on('shopping:item:deleted', handleShoppingChange)
    on('reconstruction:created', handleReconstructionChange)
    on('reconstruction:updated', handleReconstructionChange)
    on('reconstruction:deleted', handleReconstructionChange)

    return () => {
      off('reservation:created', handleReservationChange)
      off('reservation:updated', handleReservationChange)
      off('reservation:deleted', handleReservationChange)
      off('message:created', handleMessageCreated)
      off('message:updated', handleMessageUpdated)
      off('message:deleted', handleMessageDeleted)
      off('message:reaction', handleMessageReaction)
      off('note:created', handleMessageCreated)
      off('shopping:item:added', handleShoppingChange)
      off('shopping:item:updated', handleShoppingChange)
      off('shopping:item:deleted', handleShoppingChange)
      off('reconstruction:created', handleReconstructionChange)
      off('reconstruction:updated', handleReconstructionChange)
      off('reconstruction:deleted', handleReconstructionChange)
    }
  }, [on, off, qc, user, socketGeneration])
}
