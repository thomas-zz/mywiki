import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILL_SRC = path.join(__dirname, '..', 'skill')
const HOME = os.homedir()

export const TARGETS = [
  { id: 'claude', name: 'Claude Code', detect: () => fs.existsSync(path.join(HOME, '.claude')) },
  { id: 'cursor', name: 'Cursor', detect: () => fs.existsSync(path.join(HOME, '.cursor')) },
  { id: 'codex', name: 'Codex', detect: () => fs.existsSync(path.join(HOME, '.codex')) },
  { id: 'windsurf', name: 'Windsurf', detect: () => fs.existsSync(path.join(HOME, '.codeium')) },
  { id: 'opencode', name: 'OpenCode', detect: () => fs.existsSync(path.join(HOME, '.config', 'opencode')) },
]

export function installToTargets(targetIds, wikiDir) {
  const results = []
  for (const id of targetIds) {
    const dest = INSTALLERS[id](wikiDir)
    results.push({ id, dest })
  }
  return results
}

const INSTALLERS = {
  claude(wikiDir) {
    const dest = path.join(HOME, '.claude', 'skills', 'mywiki')
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true })
    fs.mkdirSync(dest, { recursive: true })
    copyDirSync(SKILL_SRC, dest)
    injectWikiDir(path.join(dest, 'SKILL.md'), wikiDir)
    return dest
  },

  cursor(wikiDir) {
    const dir = path.join(HOME, '.cursor', 'rules')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, 'mywiki.mdc')
    const content = buildFlatSkill(wikiDir)
    const mdc = `---\ndescription: myWiki 知识管理 skill\nglobs: \nalwaysApply: true\n---\n\n${content}\n`
    fs.writeFileSync(dest, mdc)
    return dest
  },

  codex(wikiDir) {
    const dir = path.join(HOME, '.codex')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, 'AGENTS.md')
    const content = buildFlatSkill(wikiDir)
    writeMarkedSection(dest, content)
    return dest
  },

  windsurf(wikiDir) {
    const dir = path.join(HOME, '.codeium', 'windsurf', 'memories')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, 'global_rules.md')
    const content = buildFlatSkill(wikiDir)
    writeMarkedSection(dest, content)
    return dest
  },

  opencode(wikiDir) {
    const dir = path.join(HOME, '.config', 'opencode')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, 'AGENTS.md')
    const content = buildFlatSkill(wikiDir)
    writeMarkedSection(dest, content)
    return dest
  },
}

function buildFlatSkill(wikiDir) {
  const parts = []
  const mainSkill = path.join(SKILL_SRC, 'SKILL.md')
  if (fs.existsSync(mainSkill)) {
    let content = fs.readFileSync(mainSkill, 'utf-8')
    content = content.replace(
      /## Wiki 位置[\s\S]*?(?=\n## )/,
      `## Wiki 位置\n\nwiki 数据在 \`${wikiDir}\` 目录下，包含 \`nodes/\`、\`raw/\`、\`meta/\` 三个子目录。找不到时询问用户路径。\n\n`
    )
    parts.push(content)
  }
  const entries = fs.readdirSync(SKILL_SRC, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subSkill = path.join(SKILL_SRC, entry.name, 'SKILL.md')
      if (fs.existsSync(subSkill)) {
        parts.push(`\n---\n\n# ${entry.name}\n\n${fs.readFileSync(subSkill, 'utf-8')}`)
      }
    }
  }
  return parts.join('\n')
}

const MARKER_START = '<!-- mywiki:start -->'
const MARKER_END = '<!-- mywiki:end -->'

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

function injectWikiDir(skillPath, wikiDir) {
  if (!fs.existsSync(skillPath)) return
  let content = fs.readFileSync(skillPath, 'utf-8')
  content = content.replace(
    /## Wiki 位置[\s\S]*?(?=\n## )/,
    `## Wiki 位置\n\nwiki 数据在 \`${wikiDir}\` 目录下，包含 \`nodes/\`、\`raw/\`、\`meta/\` 三个子目录。找不到时询问用户路径。\n\n`
  )
  fs.writeFileSync(skillPath, content)
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
