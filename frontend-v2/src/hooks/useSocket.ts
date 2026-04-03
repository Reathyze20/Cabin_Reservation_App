/**
 * hooks/useSocket.ts — Socket.io client hook with JWT auth and cabin rooms.
 * Connects once per mount, auto-disconnects on unmount.
 * Provides `on`, `off`, `emit` helpers bound to the current connection.
 */
import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

/**
 * Connect to the Socket.io server, authenticated via JWT.
 * Re-connects when the token changes. Disconnects on unmount.
 *
 * @returns `{ on, off, emit, connected }` — socket event helpers
 */
export function useSocket() {
  const { token } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io({
      path: '/ws',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler as (...args: unknown[]) => void)
  }, [])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { on, off, emit }
}
