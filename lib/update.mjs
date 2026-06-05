import { readConfig, getSkillStoreDir } from './config.mjs'
import { TARGETS, installToTargets } from './targets.mjs'

export function update() {
  const config = readConfig()
  if (!config) {
    console.error('❌ 未找到配置文件。请先运行 mywiki init')
    process.exit(1)
  }

  const targetIds = config.targets || ['claude']

  const results = installToTargets(targetIds)
  console.log('\n✅ Skill 已更新到最新版本')
  console.log(`   Skill 源目录: ${getSkillStoreDir()}`)
  for (const { id, dest, mode, removedLegacyInjection } of results) {
    const name = TARGETS.find(t => t.id === id).name
    console.log(`   ${name} [${mode}] → ${dest}`)
    if (removedLegacyInjection) {
      console.log(`     提示: ${name} 旧的 AGENTS 注入区块已移除，现改为 skills 目录安装`)
    }
  }
  console.log('')
}
