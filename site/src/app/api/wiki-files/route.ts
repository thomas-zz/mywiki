import fs from 'fs'
import path from 'path'
import os from 'os'
import { isAuthorized } from '@/lib/auth'

export async function GET(request: Request) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('dir')
  if (!raw) return Response.json({ error: 'missing dir' }, { status: 400 })
  if (raw.includes('..')) return Response.json({ error: 'invalid path' }, { status: 400 })

  let dir = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : raw
  dir = path.resolve(dir)

  let nodesDir = path.join(dir, 'nodes')
  if (!fs.existsSync(nodesDir)) nodesDir = dir

  if (!fs.existsSync(nodesDir)) {
    return Response.json({ error: 'directory not found' }, { status: 404 })
  }

  const files: { name: string; content: string }[] = []
  for (const name of fs.readdirSync(nodesDir)) {
    if (!name.endsWith('.md')) continue
    const content = fs.readFileSync(path.join(nodesDir, name), 'utf-8')
    files.push({ name, content })
  }

  return Response.json(files)
}
