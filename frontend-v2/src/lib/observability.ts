export interface ApiCorrelationSnapshot {
  requestId?: string
  errorId?: string
  supportCode?: string
  status?: number
  method?: string
  url?: string
  timestamp: number
}

let lastApiCorrelation: ApiCorrelationSnapshot | null = null
let lastServerFailureCorrelation: ApiCorrelationSnapshot | null = null

export function getSupportCodeFromSnapshot(
  snapshot: Pick<ApiCorrelationSnapshot, 'supportCode' | 'errorId' | 'requestId'> | null | undefined,
): string | undefined {
  return snapshot?.supportCode ?? snapshot?.errorId ?? snapshot?.requestId
}

export function rememberApiCorrelation(
  snapshot: Omit<ApiCorrelationSnapshot, 'timestamp' | 'supportCode'> & { supportCode?: string },
): void {
  const normalized: ApiCorrelationSnapshot = {
    ...snapshot,
    supportCode: snapshot.supportCode ?? snapshot.errorId ?? snapshot.requestId,
    timestamp: Date.now(),
  }

  lastApiCorrelation = normalized
  if ((normalized.status ?? 0) >= 500) {
    lastServerFailureCorrelation = normalized
  }
}

export function getLastApiCorrelation(): ApiCorrelationSnapshot | null {
  return lastApiCorrelation ? { ...lastApiCorrelation } : null
}

export function getRecentSupportCode(windowMs = 2_500): string | undefined {
  if (!lastServerFailureCorrelation) return undefined
  if (Date.now() - lastServerFailureCorrelation.timestamp > windowMs) return undefined
  return getSupportCodeFromSnapshot(lastServerFailureCorrelation)
}