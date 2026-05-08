import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname)
const NODES_DIR = path.join(SCRIPT_DIR, '..', '..', 'myWiki', 'nodes')

const VALID_META_TYPES = ['observation', 'insight', 'decision', 'question', 'comparison']
const VALID_STATUSES = ['seed', 'growing', 'mature', 'needs-split', 'archived']
const VALID_INSIGHT_ORIGINS = ['explicit', 'inferred', 'mixed']
const VALID_RELATION_TYPES = [
  'implements', 'contradicts', 'contrasts', 'extends',
  'instance-of', 'prerequisite', 'evolves-from', 'related',
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

let errors = 0
let warnings = 0

function error(file: string, msg: string) {
  console.error(`❌ ${file}: ${msg}`)
  errors++
}

function warn(file: string, msg: string) {
  console.warn(`⚠️  ${file}: ${msg}`)
  warnings++
}

const files = fs.readdirSync(NODES_DIR).filter(f => f.endsWith('.md'))
const allIds = new Set(files.map(f => f.replace('.md', '')))

for (const file of files) {
  const expectedId = file.replace('.md', '')
  const raw = fs.readFileSync(path.join(NODES_DIR, file), 'utf-8')
  const { data: fm } = matter(raw)

  if (!fm.id) { error(file, '缺少 id'); continue }
  if (fm.id !== expectedId) error(file, `id "${fm.id}" 与文件名 "${expectedId}" 不一致`)
  if (!fm.title) error(file, '缺少 title')
  if (!fm.meta_type) error(file, '缺少 meta_type')
  else if (!VALID_META_TYPES.includes(fm.meta_type)) error(file, `无效 meta_type: ${fm.meta_type}`)

  if (fm.meta_type === 'insight' && !fm.insight_origin) warn(file, 'insight 节点建议填写 insight_origin')
  if (fm.insight_origin && !VALID_INSIGHT_ORIGINS.includes(fm.insight_origin)) {
    error(file, `无效 insight_origin: ${fm.insight_origin}`)
  }

  if (!fm.status) error(file, '缺少 status')
  else if (!VALID_STATUSES.includes(fm.status)) error(file, `无效 status: ${fm.status}`)

  if (!fm.domains || !Array.isArray(fm.domains) || fm.domains.length === 0) {
    error(file, 'domains 必须是非空数组')
  }

  const created = fm.created instanceof Date ? fm.created.toISOString().slice(0, 10) : String(fm.created || '')
  const updated = fm.updated instanceof Date ? fm.updated.toISOString().slice(0, 10) : String(fm.updated || '')
  if (!DATE_RE.test(created)) error(file, `无效 created 日期: ${created}`)
  if (!DATE_RE.test(updated)) error(file, `无效 updated 日期: ${updated}`)

  if (fm.relations && Array.isArray(fm.relations)) {
    for (const rel of fm.relations) {
      if (!rel.to) { error(file, '关系缺少 to 字段'); continue }
      if (!allIds.has(rel.to)) warn(file, `关系目标 "${rel.to}" 不存在`)
      if (rel.type && !VALID_RELATION_TYPES.includes(rel.type)) {
        error(file, `无效关系类型: ${rel.type}`)
      }
    }
  }
}

console.log(`\n校验完成: ${files.length} 个文件, ${errors} 个错误, ${warnings} 个警告`)
process.exit(errors > 0 ? 1 : 0)
