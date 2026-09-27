#!/usr/bin/env node
// PreToolUse hook for Edit|Write|MultiEdit|NotebookEdit.
// Exit 2 blocks the tool call and returns stderr to Claude as feedback.
// This is a convenience first line, not a security boundary: CI `guardrails` and the
// `main` ruleset are the real enforcement (see docs/SDLC.md §7–8).
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}

const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path
if (!target) process.exit(0)

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd()
const abs = path.resolve(projectDir, target)
const rel = path.relative(projectDir, abs).split(path.sep).join('/')
if (rel.startsWith('..')) process.exit(0)

const block = (reason) => {
  process.stderr.write(
    `Blocked by .claude/hooks/protect-paths.mjs: ${rel}\n${reason}\n` +
      'If the task explicitly requires this change, stop and ask the user to make it (see docs/SDLC.md §7–8).\n',
  )
  process.exit(2)
}

const base = path.posix.basename(rel)
if (base.startsWith('.env') && base !== '.env.example') {
  block('Secrets files must never be edited by the agent.')
}
if (rel.startsWith('.github/')) {
  block('CI workflows and GitHub config are protected; changes need human review.')
}
if (/^\.claude\/settings(\.local)?\.json$/.test(rel) || rel.startsWith('.claude/hooks/')) {
  block('Claude Code guardrail config is protected.')
}
if (rel.startsWith('prisma/migrations/') && existsSync(abs)) {
  block('Existing migrations are immutable. Create a new additive migration instead (docs/SDLC.md §6).')
}

process.exit(0)
