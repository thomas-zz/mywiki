import fs from 'fs'
import path from 'path'
import os from 'os'
import { isAuthorized } from '@/lib/auth'

const CONFIG_PATH = path.join(os.homedir(), '.mywiki', 'config.json')

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return null
  }
}

function writeConfig(config: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

function isValidWikiDir(dir: unknown): dir is string {
  if (typeof dir !== 'string') return false
  if (dir.length === 0 || dir.length > 500) return false
  if (dir.includes('..')) return false
  if (!dir.startsWith('/') && !dir.startsWith('~')) return false
  return true
}

export async function GET() {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const config = readConfig()
  if (!config) {
    return Response.json({ error: 'no config' }, { status: 404 })
  }
  return Response.json(config)
}

export async function PUT(request: Request) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const existing = readConfig() || {}

  if (body.wikiDir !== undefined) {
    if (!isValidWikiDir(body.wikiDir)) {
      return Response.json({ error: 'invalid wikiDir' }, { status: 400 })
    }
    existing.wikiDir = body.wikiDir
  }

  writeConfig(existing)
  return Response.json({ ok: true, config: existing })
}
