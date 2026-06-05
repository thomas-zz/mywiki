import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { writeConfig, readConfig, getSkillStoreDir } from './config.mjs'
import { TARGETS, installToTargets } from './targets.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES = path.join(__dirname, '..', 'templates')

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

async function askTargets() {
  const selected = TARGETS.map(t => t.detect())
  let cursor = 0

  return new Promise(resolve => {
    const render = () => {
      // Move cursor up to redraw (except first render)
      process.stdout.write(`\x1b[${TARGETS.length}A`)
      for (let i = 0; i < TARGETS.length; i++) {
        const check = selected[i] ? '●' : '○'
        const arrow = i === cursor ? '▸' : ' '
        const hint = TARGETS[i].detect() ? ' (已检测到)' : ''
        process.stdout.write(`\x1b[2K  ${arrow} ${check} ${TARGETS[i].name}${hint}\n`)
      }
    }

    console.log('  安装 skill 到哪些工具？（↑↓ 移动，空格选择，回车确认）\n')
    // Initial render
    for (let i = 0; i < TARGETS.length; i++) {
      const check = selected[i] ? '●' : '○'
      const arrow = i === cursor ? '▸' : ' '
      const hint = TARGETS[i].detect() ? ' (已检测到)' : ''
      console.log(`  ${arrow} ${check} ${TARGETS[i].name}${hint}`)
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf-8')

    const onKey = (key) => {
      if (key === '\x1b[A') { cursor = (cursor - 1 + TARGETS.length) % TARGETS.length; render() }
      else if (key === '\x1b[B') { cursor = (cursor + 1) % TARGETS.length; render() }
      else if (key === ' ') { selected[cursor] = !selected[cursor]; render() }
      else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onKey)
        const ids = TARGETS.filter((_, i) => selected[i]).map(t => t.id)
        resolve(ids.length > 0 ? ids : ['claude'])
      }
      else if (key === '\x03') { process.exit(0) }
    }
    process.stdin.on('data', onKey)
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

  // Select targets
  const targetIds = await askTargets()

  // Write config before install so skills resolve wikiDir from config.json on first use
  const config = { wikiDir, targets: targetIds, panel: { port: 9888 } }
  writeConfig(config)
  console.log('  ✓ 配置写入 ~/.mywiki/config.json')

  // Install skill to selected targets
  const results = installToTargets(targetIds)
  for (const { id, dest, mode, removedLegacyInjection } of results) {
    const name = TARGETS.find(t => t.id === id).name
    console.log(`  ✓ Skill 安装到 ${name} [${mode}] → ${dest}`)
    if (removedLegacyInjection) {
      console.log(`    提示: ${name} 旧的 AGENTS 注入区块已移除，现改为 skills 目录安装`)
    }
  }
  console.log(`  ✓ Skill 源目录同步到 ${getSkillStoreDir()}`)

  console.log(`
✅ 初始化完成！

  wiki 数据目录: ${wikiDir}
  已安装工具:   ${targetIds.join(', ')}

使用方式:
  1. 在 AI 工具中直接对话，说 "帮我摄入这篇文章: <url>"
  2. 运行 mywiki panel 启动可视化面板查看知识图谱
     (或 npx mywiki-cli panel)
`)
}
