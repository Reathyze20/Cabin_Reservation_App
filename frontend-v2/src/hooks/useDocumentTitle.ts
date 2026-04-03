import { useEffect } from 'react'

const APP_NAME = 'kdynachatu.cz'

/**
 * Sets document.title on mount and restores default on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => { document.title = prev }
  }, [title])
}
