import { isNetworkError } from '@/lib/networkError'

type ShoppingErrorVariant = 'master' | 'detail' | 'modal'

interface ShoppingErrorStateProps {
  title: string
  error?: unknown
  description?: string
  onRetry?: () => void
  actionLabel?: string
  variant?: ShoppingErrorVariant
}

export function getShoppingLoadErrorMessage(error: unknown, fallback?: string): string {
  if (isNetworkError(error)) {
    return 'Vypadá to na problém s připojením. Obnovte spojení a zkuste načtení zopakovat.'
  }

  return fallback ?? 'Data se teď nepodařilo načíst. Zkuste to prosím znovu.'
}

export function getShoppingActionErrorMessage(
  error: unknown,
  fallback: string,
  offlineFallback = 'Spojení vypadlo dřív, než se změna stihla uložit. Zkuste to znovu po obnovení připojení.',
): string {
  return isNetworkError(error) ? offlineFallback : fallback
}

export function ShoppingErrorState({
  title,
  error,
  description,
  onRetry,
  actionLabel = 'Zkusit znovu',
  variant = 'detail',
}: ShoppingErrorStateProps) {
  return (
    <div className={`shopping-panel-error shopping-panel-error--${variant}`} role="alert">
      <img
        src="/icons/error-cesta.svg"
        alt=""
        aria-hidden="true"
        className="shopping-panel-error-illustration"
      />
      <p className="shopping-panel-error-title">{title}</p>
      <p className="shopping-panel-error-text">
        {description ?? getShoppingLoadErrorMessage(error)}
      </p>
      {onRetry ? (
        <button
          type="button"
          className="button-secondary shopping-panel-error-action"
          onClick={onRetry}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}