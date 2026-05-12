import fs from 'fs'
import path from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

async function renderChangelog(): Promise<string> {
  const filePath = path.join(process.cwd(), '..', 'CHANGELOG.md')
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
