import fs from 'node:fs/promises'
import path from 'node:path'

type Severity = 'ERROR' | 'WARNING'

interface Finding {
  severity: Severity
  file: string
  message: string
}

interface Frontmatter {
  [key: string]: string
}

const repoRoot = process.cwd()

const requiredFiles = [
  '.github/copilot-instructions.md',
  '.github/instructions/ai-customizations.instructions.md',
  '.github/instructions/frontend-v2.instructions.md',
  '.github/instructions/backend.instructions.md',
  '.github/instructions/docs-memory.instructions.md',
  '.github/hooks/ai-governance.json',
  '.github/workflows/ai-governance.yml',
  'docs/AI-INFRASTRUCTURE-REGISTRY.md',
  'docs/AI-INFRASTRUCTURE-AUDIT.md',
  'memories/repo/stack-facts.md',
  'memories/repo/ai-infrastructure-map.md',
  'memories/repo/known-ai-drift-risks.md',
  'src/scripts/validateAiAssets.ts',
  'src/scripts/aiGovernanceHook.ts',
  'src/scripts/reportAiGovernance.ts',
]

const stalePatterns = [
  { regex: /workspaceId/g, message: 'Active AI assets must use cabinId, not workspaceId.' },
  { regex: /hash-based router|hash router/gi, message: 'Active AI assets must not describe the current frontend as hash-routed.' },
  { regex: /Vanilla TypeScript/gi, message: 'Active AI assets must not describe the current frontend as Vanilla TypeScript.' },
  { regex: /React 18/gi, message: 'Active AI assets must not describe the current frontend as React 18.' },
  { regex: /Vite 6(\.x)?/gi, message: 'Active AI assets must not describe the current frontend as Vite 6.' },
]

async function exists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function walk(dir: string, predicate?: (absolutePath: string) => boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walk(absolutePath, predicate))
      continue
    }

    if (!predicate || predicate(absolutePath)) {
      results.push(absolutePath)
    }
  }

  return results.sort()
}

function rel(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
}

function parseFrontmatter(content: string): Frontmatter | null {
  const normalized = content.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const frontmatter: Frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    value = value.replace(/^['"]|['"]$/g, '')
    frontmatter[key] = value
  }

  return frontmatter
}

async function readText(absolutePath: string): Promise<string> {
  return fs.readFile(absolutePath, 'utf8')
}

function pushFinding(findings: Finding[], severity: Severity, file: string, message: string): void {
  findings.push({ severity, file, message })
}

function validateUniqueNames(findings: Finding[], items: Array<{ file: string; name: string }>, kind: string): void {
  const seen = new Map<string, string>()

  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    if (!key) continue
    const existing = seen.get(key)
    if (existing) {
      pushFinding(findings, 'ERROR', item.file, `Duplicate ${kind} name '${item.name}' also used in ${existing}.`)
    } else {
      seen.set(key, item.file)
    }
  }
}

function validateStalePatterns(findings: Finding[], file: string, content: string): void {
  for (const line of content.split(/\r?\n/)) {
    const guardrailContext = /\b(do not|must not|never|avoid|instead of|no longer|deprecated|legacy|prefer .* over |use .* not )/i.test(line)
    if (guardrailContext) continue

    for (const rule of stalePatterns) {
      if (rule.regex.test(line)) {
        pushFinding(findings, 'ERROR', file, rule.message)
      }
    }
  }
}

async function validateAgents(findings: Finding[]): Promise<void> {
  const agentDir = path.join(repoRoot, '.github/agents')
  const files = await walk(agentDir, (file) => file.endsWith('.agent.md'))
  const names: Array<{ file: string; name: string }> = []

  for (const file of files) {
    const content = await readText(file)
    const fm = parseFrontmatter(content)
    const relativeFile = rel(file)

    if (!fm) {
      pushFinding(findings, 'ERROR', relativeFile, 'Missing frontmatter.')
      continue
    }

    if (!fm.name) pushFinding(findings, 'ERROR', relativeFile, 'Agent frontmatter is missing name.')
    if (!fm.description) pushFinding(findings, 'ERROR', relativeFile, 'Agent frontmatter is missing description.')
    if (path.basename(file).includes(' ')) pushFinding(findings, 'WARNING', relativeFile, 'Agent filename contains spaces; prefer kebab-case.')

    if (fm.name) names.push({ file: relativeFile, name: fm.name })
  }

  validateUniqueNames(findings, names, 'agent')
}

async function validatePrompts(findings: Finding[]): Promise<void> {
  const promptDir = path.join(repoRoot, '.github/prompts')
  const files = await walk(promptDir, (file) => file.endsWith('.prompt.md'))
  const names: Array<{ file: string; name: string }> = []

  for (const file of files) {
    const content = await readText(file)
    const fm = parseFrontmatter(content)
    const relativeFile = rel(file)

    if (!fm) {
      pushFinding(findings, 'ERROR', relativeFile, 'Missing frontmatter.')
      continue
    }

    if (!fm.name) pushFinding(findings, 'WARNING', relativeFile, 'Prompt frontmatter should include name.')
    if (!fm.description) pushFinding(findings, 'WARNING', relativeFile, 'Prompt frontmatter should include description for discovery.')
    if (fm.name) names.push({ file: relativeFile, name: fm.name })
  }

  validateUniqueNames(findings, names, 'prompt')
}

async function validateInstructions(findings: Finding[]): Promise<void> {
  const instructionDir = path.join(repoRoot, '.github/instructions')
  const files = await walk(instructionDir, (file) => file.endsWith('.instructions.md'))

  for (const file of files) {
    const content = await readText(file)
    const fm = parseFrontmatter(content)
    const relativeFile = rel(file)

    if (!fm) {
      pushFinding(findings, 'ERROR', relativeFile, 'Missing frontmatter.')
      continue
    }

    if (!fm.description) pushFinding(findings, 'ERROR', relativeFile, 'Instruction frontmatter is missing description.')
    if (!fm.applyTo) pushFinding(findings, 'WARNING', relativeFile, 'Instruction should define applyTo for deterministic loading.')
  }
}

async function validateSkills(findings: Finding[]): Promise<void> {
  const skillRoot = path.join(repoRoot, '.agents/skills')
  const entries = await fs.readdir(skillRoot, { withFileTypes: true })
  const names: Array<{ file: string; name: string }> = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillDir = path.join(skillRoot, entry.name)
    const skillFile = path.join(skillDir, 'SKILL.md')
    const evalsFile = path.join(skillDir, 'evals/evals.json')
    const relativeSkillFile = rel(skillFile)

    if (!await exists(rel(skillFile))) {
      pushFinding(findings, 'ERROR', rel(skillDir), 'Skill directory is missing SKILL.md.')
      continue
    }

    const content = await readText(skillFile)
    const fm = parseFrontmatter(content)
    if (!fm) {
      pushFinding(findings, 'ERROR', relativeSkillFile, 'Missing frontmatter.')
      continue
    }

    if (!fm.name) pushFinding(findings, 'ERROR', relativeSkillFile, 'Skill frontmatter is missing name.')
    if (!fm.description) pushFinding(findings, 'ERROR', relativeSkillFile, 'Skill frontmatter is missing description.')
    if (fm.name && fm.name !== entry.name) {
      pushFinding(findings, 'WARNING', relativeSkillFile, `Skill name '${fm.name}' does not match folder '${entry.name}'.`)
    }
    if (fm.name) names.push({ file: relativeSkillFile, name: fm.name })

    if (!await exists(rel(evalsFile))) {
      pushFinding(findings, 'ERROR', rel(evalsFile), 'Skill is missing evals/evals.json.')
      continue
    }

    try {
      const evalsRaw = await readText(evalsFile)
      const evalsJson = JSON.parse(evalsRaw) as { skill_name?: string; evals?: Array<{ id?: number }> }

      if (!evalsJson.skill_name) pushFinding(findings, 'ERROR', rel(evalsFile), 'evals.json is missing skill_name.')
      if (fm.name && evalsJson.skill_name && evalsJson.skill_name !== fm.name) {
        pushFinding(findings, 'ERROR', rel(evalsFile), `evals skill_name '${evalsJson.skill_name}' does not match SKILL.md name '${fm.name}'.`)
      }

      if (!Array.isArray(evalsJson.evals) || evalsJson.evals.length < 2) {
        pushFinding(findings, 'ERROR', rel(evalsFile), 'evals.json must contain at least two eval prompts.')
      } else {
        const ids = new Set<number>()
        for (const evalEntry of evalsJson.evals) {
          if (typeof evalEntry.id !== 'number') {
            pushFinding(findings, 'ERROR', rel(evalsFile), 'Every eval entry must have a numeric id.')
            continue
          }
          if (ids.has(evalEntry.id)) {
            pushFinding(findings, 'ERROR', rel(evalsFile), `Duplicate eval id '${evalEntry.id}'.`)
          }
          ids.add(evalEntry.id)
        }
      }
    } catch (error) {
      pushFinding(findings, 'ERROR', rel(evalsFile), `Failed to parse evals.json: ${String(error)}`)
    }
  }

  validateUniqueNames(findings, names, 'skill')
}

async function validateHooks(findings: Finding[]): Promise<void> {
  const hookDir = path.join(repoRoot, '.github/hooks')
  const files = await walk(hookDir, (file) => file.endsWith('.json'))
  const requiredEvents = ['SessionStart', 'PreToolUse', 'PostToolUse']

  for (const file of files) {
    const relativeFile = rel(file)
    try {
      const content = await readText(file)
      const json = JSON.parse(content) as {
        hooks?: Record<string, Array<{ type?: string; command?: string; windows?: string }>>
      }

      if (!json.hooks || typeof json.hooks !== 'object') {
        pushFinding(findings, 'ERROR', relativeFile, 'Hook config must contain a hooks object.')
        continue
      }

      for (const eventName of requiredEvents) {
        const hookEntries = json.hooks[eventName]
        if (!Array.isArray(hookEntries) || hookEntries.length === 0) {
          pushFinding(findings, 'ERROR', relativeFile, `Hook config is missing '${eventName}' coverage.`)
          continue
        }

        for (const hookEntry of hookEntries) {
          if (hookEntry.type !== 'command') {
            pushFinding(findings, 'ERROR', relativeFile, `${eventName} hook must use command type.`)
          }

          const commandText = `${hookEntry.command ?? ''} ${hookEntry.windows ?? ''}`
          if (!commandText.includes('src/scripts/aiGovernanceHook.ts')) {
            pushFinding(findings, 'ERROR', relativeFile, `${eventName} hook must target src/scripts/aiGovernanceHook.ts.`)
          }
        }
      }
    } catch (error) {
      pushFinding(findings, 'ERROR', relativeFile, `Failed to parse hook JSON: ${String(error)}`)
    }
  }
}

async function validatePackageScripts(findings: Finding[]): Promise<void> {
  const packageFile = path.join(repoRoot, 'package.json')

  try {
    const content = await readText(packageFile)
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> }
    const scripts = pkg.scripts ?? {}

    if (scripts['validate:ai'] !== 'tsx src/scripts/validateAiAssets.ts') {
      pushFinding(findings, 'ERROR', 'package.json', "Script 'validate:ai' must point to tsx src/scripts/validateAiAssets.ts.")
    }

    if (scripts['report:ai'] !== 'tsx src/scripts/reportAiGovernance.ts') {
      pushFinding(findings, 'ERROR', 'package.json', "Script 'report:ai' must point to tsx src/scripts/reportAiGovernance.ts.")
    }
  } catch (error) {
    pushFinding(findings, 'ERROR', 'package.json', `Failed to parse package.json: ${String(error)}`)
  }
}

async function validateWorkflow(findings: Finding[]): Promise<void> {
  const workflowFile = path.join(repoRoot, '.github/workflows/ai-governance.yml')
  const relativeFile = rel(workflowFile)

  try {
    const content = await readText(workflowFile)
    const expectedPaths = [
      '.github/**',
      '.agents/**',
      'memories/**',
      'docs/AI-INFRASTRUCTURE*.md',
      'src/scripts/validateAiAssets.ts',
      'src/scripts/aiGovernanceHook.ts',
      'src/scripts/reportAiGovernance.ts',
      'package.json',
    ]

    for (const expectedPath of expectedPaths) {
      if (!content.includes(expectedPath)) {
        pushFinding(findings, 'ERROR', relativeFile, `Workflow must watch '${expectedPath}'.`)
      }
    }

    if (!content.includes('npm run validate:ai')) {
      pushFinding(findings, 'ERROR', relativeFile, 'Workflow must run npm run validate:ai.')
    }

    if (!content.includes('npm run report:ai')) {
      pushFinding(findings, 'ERROR', relativeFile, 'Workflow must generate AI governance report output.')
    }

    if (!content.includes('actions/upload-artifact@v4')) {
      pushFinding(findings, 'WARNING', relativeFile, 'Workflow should upload AI governance report as an artifact.')
    }
  } catch (error) {
    pushFinding(findings, 'ERROR', relativeFile, `Failed to read workflow: ${String(error)}`)
  }
}

async function validateRegistry(findings: Finding[]): Promise<void> {
  const registryFile = path.join(repoRoot, 'docs/AI-INFRASTRUCTURE-REGISTRY.md')
  const registryContent = await readText(registryFile)
  const expectedEntries = new Set<string>([
    '.github/copilot-instructions.md',
    '.github/hooks/ai-governance.json',
    '.github/workflows/ai-governance.yml',
    'docs/AI-INFRASTRUCTURE-AUDIT.md',
    'memories/repo/stack-facts.md',
    'memories/repo/ai-infrastructure-map.md',
    'memories/repo/known-ai-drift-risks.md',
    'src/scripts/validateAiAssets.ts',
    'src/scripts/aiGovernanceHook.ts',
    'src/scripts/reportAiGovernance.ts',
  ])

  const instructionFiles = await walk(path.join(repoRoot, '.github/instructions'), (file) => file.endsWith('.instructions.md'))
  const agentFiles = await walk(path.join(repoRoot, '.github/agents'), (file) => file.endsWith('.agent.md'))
  const promptFiles = await walk(path.join(repoRoot, '.github/prompts'), (file) => file.endsWith('.prompt.md'))
  const skillRoot = path.join(repoRoot, '.agents/skills')
  const skillEntries = await fs.readdir(skillRoot, { withFileTypes: true })

  for (const file of [...instructionFiles, ...agentFiles, ...promptFiles]) {
    expectedEntries.add(rel(file))
  }

  for (const entry of skillEntries) {
    if (!entry.isDirectory()) continue
    expectedEntries.add(`${rel(path.join(skillRoot, entry.name))}/`)
  }

  for (const expectedEntry of expectedEntries) {
    if (!registryContent.includes(expectedEntry)) {
      pushFinding(findings, 'ERROR', 'docs/AI-INFRASTRUCTURE-REGISTRY.md', `Registry is missing active entry '${expectedEntry}'.`)
    }
  }
}

async function validateMemory(findings: Finding[]): Promise<void> {
  const memoryDir = path.join(repoRoot, 'memories/repo')
  const files = await walk(memoryDir, (file) => file.endsWith('.md'))

  for (const file of files) {
    const relativeFile = rel(file)
    if (relativeFile === 'memories/repo/app-knowledge-base.md') continue

    const content = await readText(file)
    if (!content.includes('Verified:')) pushFinding(findings, 'WARNING', relativeFile, 'Repo memory file should include Verified: metadata.')
    if (!content.includes('Scope:')) pushFinding(findings, 'WARNING', relativeFile, 'Repo memory file should include Scope: metadata.')
  }
}

async function validateCanonicalFiles(findings: Finding[]): Promise<void> {
  for (const file of requiredFiles) {
    if (!await exists(file)) {
      pushFinding(findings, 'ERROR', file, 'Missing required AI governance file.')
    }
  }
}

async function validateDrift(findings: Finding[]): Promise<void> {
  const activeFiles = [
    '.github/copilot-instructions.md',
    ...await walk(path.join(repoRoot, '.github/agents'), (file) => file.endsWith('.agent.md')),
    ...await walk(path.join(repoRoot, '.github/prompts'), (file) => file.endsWith('.prompt.md')),
    ...await walk(path.join(repoRoot, '.github/instructions'), (file) => file.endsWith('.instructions.md')),
  ]

  for (const target of activeFiles) {
    const absolutePath = path.isAbsolute(target) ? target : path.join(repoRoot, target)
    const relativeFile = rel(absolutePath)
    const content = await readText(absolutePath)
    validateStalePatterns(findings, relativeFile, content)
  }
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  await validateCanonicalFiles(findings)
  await validateAgents(findings)
  await validatePrompts(findings)
  await validateInstructions(findings)
  await validateSkills(findings)
  await validateHooks(findings)
  await validatePackageScripts(findings)
  await validateWorkflow(findings)
  await validateRegistry(findings)
  await validateMemory(findings)
  await validateDrift(findings)

  const errors = findings.filter((finding) => finding.severity === 'ERROR')
  const warnings = findings.filter((finding) => finding.severity === 'WARNING')

  if (findings.length === 0) {
    console.log('AI governance validation passed with no findings.')
    return
  }

  console.log('AI governance validation findings:')
  for (const finding of findings) {
    console.log(`[${finding.severity}] ${finding.file}: ${finding.message}`)
  }

  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s).`)

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

await main()