#!/usr/bin/env node
// PR guardrails for AI-assisted development (docs/SDLC.md §6–8).
// Env: BASE_SHA, HEAD_SHA, PR_LABELS (JSON array of label names).
import { execFileSync } from 'node:child_process'

const MAX_CHANGED_LINES = 400
const SIZE_EXCLUDES = [/(^|\/)package-lock\.json$/, /^prisma\/migrations\//]
const SENSITIVE = [
  /^\.github\//,
  /^\.claude\//,
  /^CLAUDE\.md$/,
  /^Dockerfile$/,
  /^docker-compose\.yml$/,
  /^nginx-chata\.conf$/,
  /^prisma\/schema\.prisma$/,
  /^src\/middleware\//,
  /^src\/backend\/routes\/auth/,
  /^src\/utils\/prisma\.ts$/,
  /^src\/utils\/socket\.ts$/,
]
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/
const FOCUS_OR_SKIP = /\b(?:it|test|describe)\.(?:only|skip)\s*\(|\bx(?:it|describe|test)\s*\(|\bf(?:it|describe)\s*\(/
const DESTRUCTIVE_SQL = /\b(DROP\s+(TABLE|COLUMN|INDEX|TYPE|CONSTRAINT)|RENAME\s+(COLUMN|TO)|SET\s+NOT\s+NULL|TRUNCATE)\b/i

const { BASE_SHA, HEAD_SHA } = process.env
if (!BASE_SHA || !HEAD_SHA) {
  console.error('BASE_SHA and HEAD_SHA are required')
  process.exit(1)
}
const labels = new Set(JSON.parse(process.env.PR_LABELS || '[]'))
const range = `${BASE_SHA}...${HEAD_SHA}`
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const failures = []
const fail = (msg) => failures.push(msg)

// name-status: "M\tpath", "A\tpath", "R100\told\tnew"
const changes = git('diff', '--name-status', '--no-renames', range)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, file] = line.split('\t')
    return { status, file }
  })

// 1. Existing migrations are immutable.
const touchedMigrations = changes.filter((c) => c.file.startsWith('prisma/migrations/') && c.status !== 'A')
for (const c of touchedMigrations) {
  fail(`Existing migration modified or deleted (${c.status}): ${c.file}. Add a new migration instead.`)
}

// 2. Destructive SQL in new migrations needs explicit approval.
if (!labels.has('migration-contract-approved')) {
  for (const c of changes.filter((c) => c.status === 'A' && /^prisma\/migrations\/.+\.sql$/.test(c.file))) {
    const sql = git('show', `${HEAD_SHA}:${c.file}`)
    const match = sql.match(DESTRUCTIVE_SQL)
    if (match) fail(`Destructive SQL "${match[0]}" in ${c.file} requires label 'migration-contract-approved'.`)
  }
}

// 3. Sensitive paths need a human to read them.
const sensitive = changes.filter((c) => SENSITIVE.some((re) => re.test(c.file))).map((c) => c.file)
if (sensitive.length && !labels.has('human-reviewed')) {
  fail(`Sensitive paths changed, add label 'human-reviewed' after reading them:\n    ${sensitive.join('\n    ')}`)
}

// 4. PR size.
let changedLines = 0
for (const line of git('diff', '--numstat', '--no-renames', range).split('\n').filter(Boolean)) {
  const [added, deleted, file] = line.split('\t')
  if (SIZE_EXCLUDES.some((re) => re.test(file))) continue
  if (added === '-') continue // binary
  changedLines += Number(added) + Number(deleted)
}
if (changedLines > MAX_CHANGED_LINES && !labels.has('large-pr-ok')) {
  fail(`PR changes ${changedLines} lines (limit ${MAX_CHANGED_LINES}, lockfiles and migrations excluded). Split it or add label 'large-pr-ok'.`)
}

// 5. No focused or skipped tests in added lines.
for (const c of changes.filter((c) => c.status !== 'D' && TEST_FILE.test(c.file))) {
  const added = git('diff', '-U0', range, '--', c.file)
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  const hit = added.find((l) => FOCUS_OR_SKIP.test(l))
  if (hit) fail(`Focused/skipped test added in ${c.file}: ${hit.slice(1).trim()}`)
}

console.log(`Changed files: ${changes.length}, changed lines (counted): ${changedLines}`)
console.log(`Labels: ${[...labels].join(', ') || '(none)'}`)
if (failures.length) {
  console.error(`\nGuardrails failed (docs/SDLC.md §6–8):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('Guardrails passed.')
