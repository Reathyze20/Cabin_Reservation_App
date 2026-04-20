import fs from 'node:fs/promises'
import path from 'node:path'

interface Frontmatter {
  [key: string]: string
}

interface NamedAsset {
  file: string
  name: string
}

const repoRoot = process.cwd()

function rel(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
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

async function collectNamedAssets(dir: string, extension: string): Promise<NamedAsset[]> {
  const files = await walk(dir, (file) => file.endsWith(extension))
  const assets: NamedAsset[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    const frontmatter = parseFrontmatter(content)
    assets.push({
      file: rel(file),
      name: frontmatter?.name || path.basename(file),
    })
  }

  return assets
}

async function collectSkills(): Promise<Array<NamedAsset & { evalCount: number }>> {
  const skillRoot = path.join(repoRoot, '.agents/skills')
  const entries = await fs.readdir(skillRoot, { withFileTypes: true })
  const skills: Array<NamedAsset & { evalCount: number }> = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillDir = path.join(skillRoot, entry.name)
    const skillFile = path.join(skillDir, 'SKILL.md')
    const evalsFile = path.join(skillDir, 'evals/evals.json')
    const skillContent = await fs.readFile(skillFile, 'utf8')
    const frontmatter = parseFrontmatter(skillContent)
    let evalCount = 0

    try {
      const evalsContent = await fs.readFile(evalsFile, 'utf8')
      const evalsJson = JSON.parse(evalsContent) as { evals?: unknown[] }
      evalCount = Array.isArray(evalsJson.evals) ? evalsJson.evals.length : 0
    } catch {
      evalCount = 0
    }

    skills.push({
      file: `${rel(skillDir)}/`,
      name: frontmatter?.name || entry.name,
      evalCount,
    })
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name))
}

async function readHookEvents(): Promise<string[]> {
  const hookFile = path.join(repoRoot, '.github/hooks/ai-governance.json')
  const content = await fs.readFile(hookFile, 'utf8')
  const json = JSON.parse(content) as { hooks?: Record<string, unknown> }
  return Object.keys(json.hooks ?? {}).sort()
}

async function main(): Promise<void> {
  const instructions = await collectNamedAssets(path.join(repoRoot, '.github/instructions'), '.instructions.md')
  const agents = await collectNamedAssets(path.join(repoRoot, '.github/agents'), '.agent.md')
  const prompts = await collectNamedAssets(path.join(repoRoot, '.github/prompts'), '.prompt.md')
  const skills = await collectSkills()
  const hookEvents = await readHookEvents()

  console.log('AI Governance Report')
  console.log(`Generated: ${new Date().toISOString()}`)
  console.log('')

  console.log('Inventory')
  console.log(`- Instructions: ${instructions.length}`)
  console.log(`- Agents: ${agents.length}`)
  console.log(`- Prompts: ${prompts.length}`)
  console.log(`- Skills: ${skills.length}`)
  console.log(`- Hook events: ${hookEvents.length}`)
  console.log('')

  console.log('Instructions')
  for (const asset of instructions) {
    console.log(`- ${asset.name} :: ${asset.file}`)
  }
  console.log('')

  console.log('Agents')
  for (const asset of agents) {
    console.log(`- ${asset.name} :: ${asset.file}`)
  }
  console.log('')

  console.log('Prompts')
  for (const asset of prompts) {
    console.log(`- ${asset.name} :: ${asset.file}`)
  }
  console.log('')

  console.log('Skills')
  for (const asset of skills) {
    console.log(`- ${asset.name} :: ${asset.file} :: evals=${asset.evalCount}`)
  }
  console.log('')

  console.log('Governance Controls')
  console.log('- validate:ai :: package.json -> tsx src/scripts/validateAiAssets.ts')
  console.log('- report:ai :: package.json -> tsx src/scripts/reportAiGovernance.ts')
  console.log(`- hook events :: ${hookEvents.join(', ')}`)
  console.log('- workflow :: .github/workflows/ai-governance.yml')
  console.log('- canonical registry :: docs/AI-INFRASTRUCTURE-REGISTRY.md')
  console.log('- canonical stack facts :: memories/repo/stack-facts.md')
}

await main()