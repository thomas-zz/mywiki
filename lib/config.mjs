import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.mywiki')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG = {
  wikiDir: path.join(os.homedir(), 'mywiki'),
  panel: { port: 9888 },
}

export function getConfigDir() {
  return CONFIG_DIR
}

export function getConfigPath() {
  return CONFIG_PATH
}

export function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return null
  }
}

export function writeConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

export function resolveWikiDir(config) {
  const dir = config.wikiDir
  if (dir.startsWith('~')) return path.join(os.homedir(), dir.slice(1))
  return path.resolve(dir)
}
