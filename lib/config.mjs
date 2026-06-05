import fs from 'fs'
import path from 'path'
import os from 'os'

const APP_DIR = path.join(os.homedir(), '.mywiki')
const CONFIG_PATH = path.join(APP_DIR, 'config.json')
const SKILLS_DIR = path.join(APP_DIR, 'skills')
const SKILL_NAME = 'mywiki'

const DEFAULT_CONFIG = {
  wikiDir: path.join(os.homedir(), 'mywiki'),
  panel: { port: 9888 },
}

export function getAppDir() {
  return APP_DIR
}

export function getConfigDir() {
  return APP_DIR
}

export function getConfigPath() {
  return CONFIG_PATH
}

export function getSkillsDir() {
  return SKILLS_DIR
}

export function getSkillStoreDir(skillName = SKILL_NAME) {
  return path.join(SKILLS_DIR, skillName)
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
  fs.mkdirSync(APP_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

export function resolveWikiDir(config) {
  const dir = config.wikiDir
  if (dir.startsWith('~')) return path.join(os.homedir(), dir.slice(1))
  return path.resolve(dir)
}
