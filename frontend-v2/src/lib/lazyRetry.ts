import { lazy, type ComponentType } from 'react'

/**
 * Lazy-load with retry + auto-reload for stale chunks.
 * After a deploy, old chunk hashes become 404. This helper:
 *  1. retries the import once
 *  2. if still failing, reloads the page (once per session)
 */
export function lazyRetry(
  factory: () => Promise<{ default: ComponentType<unknown> }>,
) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'chunk-retry-reload'
      const hasReloaded = sessionStorage.getItem(key)
      if (!hasReloaded) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        // Return a no-op component while reloading
        return { default: (() => null) as unknown as ComponentType<unknown> }
      }
      sessionStorage.removeItem(key)
      // Re-throw so ErrorBoundary catches it
      return factory()
    }),
  )
}
