import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { writeConfig, readConfig, resolveWikiDir } from './config.mjs'
import { installSkill } from './install-skill.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES = path.join(__dirname, '..', 'templates')

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

export async function init(pathArg, opts = {}) {
  console.log('\n🌱 myWiki 初始化\n')

  let wikiDir = pathArg
  if (!wikiDir) {
    const existing = readConfig()
    const defaultPath = existing?.wikiDir || path.join(os.homedir(), 'mywiki')
    const answer = await ask(`wiki 数据存储路径 [${defaultPath}]: `)
    wikiDir = answer || defaultPath
  }

  if (wikiDir.startsWith('~')) wikiDir = path.join(os.homedir(), wikiDir.slice(1))
  wikiDir = path.resolve(wikiDir)

  // Create directory structure
  const dirs = ['nodes', 'raw', 'meta']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(wikiDir, dir), { recursive: true })
  }

  // Copy sample nodes only if --with-samples
  if (opts.withSamples) {
    const nodesDir = path.join(wikiDir, 'nodes')
    const existingNodes = fs.readdirSync(nodesDir).filter(f => f.endsWith('.md'))
    if (existingNodes.length === 0) {
      const sampleDir = path.join(TEMPLATES, 'sample-nodes')
      for (const file of fs.readdirSync(sampleDir)) {
        fs.copyFileSync(path.join(sampleDir, file), path.join(nodesDir, file))
      }
      console.log('  ✓ 复制示例节点到 nodes/')
    }
  }

  // Copy meta templates if not exist
  const metaDir = path.join(wikiDir, 'meta')
  for (const file of ['index.md', 'log.md']) {
    const dest = path.join(metaDir, file)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(TEMPLATES, 'meta', file), dest)
    }
  }
  console.log('  ✓ 目录结构创建完成')

  // Write config
  const config = { wikiDir, panel: { port: 9888 } }
  writeConfig(config)
  console.log('  ✓ 配置写入 ~/.mywiki/config.json')

  // Install skill
  const skillDest = installSkill(wikiDir)
  console.log(`  ✓ Skill 安装到 ${skillDest}`)

  console.log(`
✅ 初始化完成！

  wiki 数据目录: ${wikiDir}
  skill 位置:    ${skillDest}

使用方式:
  1. 在 Claude Code 中直接对话，说 "帮我摄入这篇文章: <url>"
  2. 运行 npx mywiki panel 启动可视化面板查看知识图谱
`)
}
