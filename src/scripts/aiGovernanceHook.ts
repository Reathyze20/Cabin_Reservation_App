import { stdin, stdout } from 'node:process'

type HookOutput = Record<string, unknown>

function deepCollectStrings(value: unknown, bucket: string[]): void {
  if (typeof value === 'string') {
    bucket.push(value)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) deepCollectStrings(item, bucket)
    return
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepCollectStrings(nested, bucket)
    }
  }
}

function detectEventName(payload: Record<string, unknown>): string {
  const candidates = [
    payload.hookEventName,
    payload.eventName,
    payload.event,
    (payload.hookSpecificInput as Record<string, unknown> | undefined)?.hookEventName,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  return 'unknown'
}

function detectToolName(payload: Record<string, unknown>): string {
  const candidates = [
    payload.toolName,
    payload.tool,
    payload.name,
    (payload.hookSpecificInput as Record<string, unknown> | undefined)?.toolName,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  return ''
}

function touchesAiAssets(strings: string[]): boolean {
  return strings.some((value) => {
    const normalized = value.replace(/\\/g, '/').toLowerCase()
    return normalized.includes('/.github/')
      || normalized.includes('/.agents/')
      || normalized.includes('/memories/repo/')
      || normalized.includes('/docs/ai-infrastructure')
      || normalized.startsWith('.github/')
      || normalized.startsWith('.agents/')
      || normalized.startsWith('memories/repo/')
      || normalized.startsWith('docs/ai-infrastructure')
  })
}

function isWriteLike(toolName: string, rawInput: string): boolean {
  return /(apply_patch|create_file|edit|write|delete|rename|move|insert)/i.test(toolName)
    || /newCode|editType|\*\*\* Begin Patch|\*\*\* Add File|\*\*\* Update File|\*\*\* Delete File/i.test(rawInput)
}

function output(json: HookOutput): void {
  stdout.write(JSON.stringify(json))
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stdin) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const rawInput = await readStdin()
  let payload: Record<string, unknown> = {}

  try {
    payload = rawInput.trim() ? JSON.parse(rawInput) as Record<string, unknown> : {}
  } catch {
    output({ continue: true })
    return
  }

  const eventName = detectEventName(payload)
  const toolName = detectToolName(payload)
  const collectedStrings: string[] = []
  deepCollectStrings(payload, collectedStrings)
  const touches = touchesAiAssets(collectedStrings)
  const writeLike = isWriteLike(toolName, rawInput)

  if (eventName === 'SessionStart') {
    output({
      continue: true,
      systemMessage: 'AI governance active. Canonical files: memories/repo/stack-facts.md and docs/AI-INFRASTRUCTURE-REGISTRY.md. After editing .github/, .agents/, memories/repo/ or AI infrastructure docs, run npm run validate:ai.',
    })
    return
  }

  if (eventName === 'PreToolUse' && touches && writeLike) {
    output({
      systemMessage: 'This action touches AI governance assets. Keep naming unique, avoid stale stack facts, and run npm run validate:ai afterwards.',
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: 'AI governance assets are protected and require explicit review discipline.',
      },
    })
    return
  }

  if (eventName === 'PostToolUse' && touches && writeLike) {
    output({
      continue: true,
      systemMessage: 'AI governance asset modified. Next step: run npm run validate:ai and update registry or memory shards if the scope changed.',
    })
    return
  }

  output({ continue: true })
}

await main()