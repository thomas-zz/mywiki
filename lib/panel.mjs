import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { readConfig, resolveWikiDir } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_DIST = path.join(__dirname, '..', 'site-dist')

export function panel(port) {
  const config = readConfig()
  if (!config) {
    console.error('❌ 未找到配置文件。请先运行 npx mywiki init')
    process.exit(1)
  }

  const wikiDir = resolveWikiDir(config)
  const serverJs = path.join(SITE_DIST, 'server.js')

  if (!fs.existsSync(serverJs)) {
    console.error('❌ 面板构建产物不存在。请确保使用的是完整版本的 mywiki 包。')
    process.exit(1)
  }

  console.log(`\n🖥  启动 myWiki 面板`)
  console.log(`   wiki 数据: ${wikiDir}`)
  console.log(`   地址: http://localhost:${port}\n`)

  const child = spawn('node', [serverJs], {
    env: {
      ...process.env,
      WIKI_DIR: wikiDir,
      PORT: String(port),
      AUTH_ENABLED: process.env.AUTH_ENABLED || 'false',
    },
    stdio: 'inherit',
  })

  child.on('error', (err) => {
    console.error('启动失败:', err.message)
    process.exit(1)
  })
}
