import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILL_SRC = path.join(__dirname, '..', 'skill')
const SKILL_DEST = path.join(os.homedir(), '.claude', 'skills', 'mywiki')

export function installSkill(wikiDir) {
  // Clean destination first to avoid stale files from previous versions
  if (fs.existsSync(SKILL_DEST)) {
    fs.rmSync(SKILL_DEST, { recursive: true })
  }
  fs.mkdirSync(SKILL_DEST, { recursive: true })

  copyDirSync(SKILL_SRC, SKILL_DEST)

  const mainSkill = path.join(SKILL_DEST, 'SKILL.md')
  if (fs.existsSync(mainSkill)) {
    let content = fs.readFileSync(mainSkill, 'utf-8')
    content = content.replace(
      /## Wiki 位置[\s\S]*?(?=\n## )/,
      `## Wiki 位置\n\nwiki 数据在 \`${wikiDir}\` 目录下，包含 \`nodes/\`、\`raw/\`、\`meta/\` 三个子目录。找不到时询问用户路径。\n\n`
    )
    fs.writeFileSync(mainSkill, content)
  }

  return SKILL_DEST
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
