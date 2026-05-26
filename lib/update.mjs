import { readConfig, resolveWikiDir } from './config.mjs'
import { TARGETS, installToTargets } from './targets.mjs'

export function update() {
  const config = readConfig()
  if (!config) {
    console.error('❌ 未找到配置文件。请先运行 mywiki init')
    process.exit(1)
  }

  const wikiDir = resolveWikiDir(config)
  const targetIds = config.targets || ['claude']

  const results = installToTargets(targetIds, wikiDir)
  console.log('\n✅ Skill 已更新到最新版本')
  for (const { id, dest } of results) {
    const name = TARGETS.find(t => t.id === id).name
    console.log(`   ${name} → ${dest}`)
  }
  console.log('')
}
