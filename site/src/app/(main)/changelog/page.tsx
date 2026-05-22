import fs from 'fs'
import path from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

function findChangelog(): string | null {
  const wikiDir = process.env.WIKI_DIR
  if (wikiDir) {
    const resolved = path.isAbsolute(wikiDir) ? wikiDir : path.resolve(wikiDir)
    const candidate = path.join(resolved, '..', 'CHANGELOG.md')
    if (fs.existsSync(candidate)) return candidate
  }
  const devPath = path.join(process.cwd(), '..', 'CHANGELOG.md')
  if (fs.existsSync(devPath)) return devPath
  return null
}

async function renderChangelog(): Promise<string> {
  const filePath = findChangelog()
  if (!filePath) return '<p>暂无更新日志</p>'
  let content = ''
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return '<p>暂无更新日志</p>'
  }
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(content)
  return String(result)
}

export default async function ChangelogPage() {
  const html = await renderChangelog()
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text)' }}>更新日志</h2>
      <div className="wiki-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
