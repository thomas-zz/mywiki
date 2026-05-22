import { readConfig, resolveWikiDir } from './config.mjs'
import { installSkill } from './install-skill.mjs'

export function update() {
  const config = readConfig()
  if (!config) {
    console.error('❌ 未找到配置文件。请先运行 npx mywiki init')
    process.exit(1)
  }

  const wikiDir = resolveWikiDir(config)
  const skillDest = installSkill(wikiDir)
  console.log(`\n✅ Skill 已更新到最新版本`)
  console.log(`   位置: ${skillDest}\n`)
}
