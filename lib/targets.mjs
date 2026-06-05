import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { getSkillStoreDir } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
const DEFAULT_CONFIG_HOME = isWindows()
  ? process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming')
  : path.join(HOME, '.config')
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || DEFAULT_CONFIG_HOME
const SKILL_NAME = 'mywiki'
const BUILT_SKILL_SRC = path.join(__dirname, '..', 'skill')
const DOCS_SKILL_SRC = path.join(__dirname, '..', 'docs', 'mywiki')
const SKILL_SRC = fs.existsSync(path.join(DOCS_SKILL_SRC, 'SKILL.md')) ? DOCS_SKILL_SRC : BUILT_SKILL_SRC

export const TARGETS = [
  { id: 'claude', name: 'Claude Code', detect: () => fs.existsSync(path.join(HOME, '.claude')) },
  { id: 'codex', name: 'Codex', detect: () => fs.existsSync(path.join(HOME, '.codex')) },
  { id: 'gemini', name: 'Gemini CLI', detect: () => fs.existsSync(path.join(HOME, '.gemini')) },
  { id: 'opencode', name: 'OpenCode', detect: () => fs.existsSync(path.join(XDG_CONFIG_HOME, 'opencode')) },
  { id: 'hermes', name: 'Hermes', detect: () => fs.existsSync(path.join(HOME, '.hermes')) },
  { id: 'cursor', name: 'Cursor (Legacy)', detect: () => fs.existsSync(path.join(HOME, '.cursor')) },
  { id: 'windsurf', name: 'Windsurf (Legacy)', detect: () => fs.existsSync(path.join(HOME, '.codeium')) },
]

const MARKER_START = '<!-- mywiki:start -->'
const MARKER_END = '<!-- mywiki:end -->'
const LEGACY_AGENT_FILES = {
  codex: [
    path.join(HOME, '.codex', 'AGENTS.md'),
  ],
  opencode: Array.from(new Set([
    path.join(XDG_CONFIG_HOME, 'opencode', 'AGENTS.md'),
    path.join(DEFAULT_CONFIG_HOME, 'opencode', 'AGENTS.md'),
  ])),
}

const INSTALLERS = {
  claude: (skillStoreDir) => installDirectorySkill(skillStoreDir, path.join(HOME, '.claude', 'skills', SKILL_NAME)),
  codex: (skillStoreDir) => {
    const removedLegacyInjection = removeMarkedSections(LEGACY_AGENT_FILES.codex)
    return {
      ...installDirectorySkill(skillStoreDir, path.join(HOME, '.codex', 'skills', SKILL_NAME)),
      removedLegacyInjection,
    }
  },
  gemini: (skillStoreDir) => installDirectorySkill(skillStoreDir, path.join(HOME, '.gemini', 'skills', SKILL_NAME)),
  opencode: (skillStoreDir) => {
    const removedLegacyInjection = removeMarkedSections(LEGACY_AGENT_FILES.opencode)
    return {
      ...installDirectorySkill(skillStoreDir, path.join(XDG_CONFIG_HOME, 'opencode', 'skills', SKILL_NAME)),
      removedLegacyInjection,
    }
  },
  hermes: (skillStoreDir) => installDirectorySkill(skillStoreDir, path.join(HOME, '.hermes', 'skills', SKILL_NAME)),
  cursor: () => installCursorRule(),
  windsurf: () => installWindsurfRule(),
}

export function installToTargets(targetIds) {
  const skillStoreDir = syncSkillStore()
  const results = []
  for (const id of targetIds) {
    const install = INSTALLERS[id]
    if (!install) throw new Error(`Unsupported target: ${id}`)
    results.push({ id, ...install(skillStoreDir) })
  }
  return results
}

function syncSkillStore() {
  const skillStoreDir = getSkillStoreDir(SKILL_NAME)
  safeRemove(skillStoreDir)
  copyDirSync(SKILL_SRC, skillStoreDir)
  return skillStoreDir
}

function installDirectorySkill(skillStoreDir, destDir) {
  fs.mkdirSync(path.dirname(destDir), { recursive: true })
  safeRemove(destDir)

  try {
    fs.symlinkSync(skillStoreDir, destDir, isWindows() ? 'junction' : 'dir')
    return { dest: destDir, mode: isWindows() ? 'junction' : 'symlink' }
  } catch {
    copyDirSync(skillStoreDir, destDir)
    return { dest: destDir, mode: 'copy' }
  }
}

function installCursorRule() {
  const dest = path.join(HOME, '.cursor', 'rules', 'mywiki.mdc')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, `---\ndescription: myWiki 知识管理 skill\nglobs: \nalwaysApply: true\n---\n\n${buildFlatSkill()}\n`)
  return { dest, mode: 'file' }
}

function installWindsurfRule() {
  const dest = path.join(HOME, '.codeium', 'windsurf', 'memories', 'global_rules.md')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  writeMarkedSection(dest, buildFlatSkill())
  return { dest, mode: 'file' }
}

function buildFlatSkill() {
  const parts = []
  const mainSkill = path.join(SKILL_SRC, 'SKILL.md')
  if (fs.existsSync(mainSkill)) {
    parts.push(fs.readFileSync(mainSkill, 'utf-8'))
  }
  const entries = fs.readdirSync(SKILL_SRC, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subSkill = path.join(SKILL_SRC, entry.name, 'SKILL.md')
    if (fs.existsSync(subSkill)) {
      parts.push(`\n---\n\n# ${entry.name}\n\n${fs.readFileSync(subSkill, 'utf-8')}`)
    }
  }
  return parts.join('\n')
}

function writeMarkedSection(filePath, content) {
  const block = `${MARKER_START}\n${content}\n${MARKER_END}`
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, block + '\n')
    return
  }
  const existing = fs.readFileSync(filePath, 'utf-8')
  const startIdx = existing.indexOf(MARKER_START)
  const endIdx = existing.indexOf(MARKER_END)
  if (startIdx !== -1 && endIdx !== -1) {
    const updated = existing.slice(0, startIdx) + block + existing.slice(endIdx + MARKER_END.length)
    fs.writeFileSync(filePath, updated)
  } else {
    fs.writeFileSync(filePath, existing.trimEnd() + '\n\n' + block + '\n')
  }
}

function removeMarkedSection(filePath) {
  if (!fs.existsSync(filePath)) return
  const existing = fs.readFileSync(filePath, 'utf-8')
  const startIdx = existing.indexOf(MARKER_START)
  const endIdx = existing.indexOf(MARKER_END)
  if (startIdx === -1 || endIdx === -1) return

  const updated = (existing.slice(0, startIdx) + existing.slice(endIdx + MARKER_END.length))
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (updated.length === 0) {
    fs.rmSync(filePath, { force: true })
  } else {
    fs.writeFileSync(filePath, updated + '\n')
  }

  return true
}

function removeMarkedSections(filePaths) {
  let removed = false
  for (const filePath of filePaths) {
    removed = removeMarkedSection(filePath) || removed
  }
  return removed
}

function safeRemove(targetPath) {
  const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false })
  if (!stat) return

  if (stat.isSymbolicLink()) {
    fs.unlinkSync(targetPath)
    return
  }

  fs.rmSync(targetPath, { recursive: true, force: true })
}

function isWindows() {
  return process.platform === 'win32'
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export const __testing = {
  buildFlatSkill,
  writeMarkedSection,
  removeMarkedSection,
  removeMarkedSections,
  installDirectorySkill,
  safeRemove,
  isWindows,
}
