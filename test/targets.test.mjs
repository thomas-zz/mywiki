import test, { after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'

const originalHome = process.env.HOME
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME
const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mywiki-targets-home-'))
const fakeXdgConfigHome = path.join(fakeHome, 'xdg')

process.env.HOME = fakeHome
process.env.XDG_CONFIG_HOME = fakeXdgConfigHome

const { installToTargets, __testing } = await import('../lib/targets.mjs')

beforeEach(() => {
  fs.mkdirSync(fakeHome, { recursive: true })
  for (const entry of fs.readdirSync(fakeHome)) {
    fs.rmSync(path.join(fakeHome, entry), { recursive: true, force: true })
  }
  fs.mkdirSync(fakeXdgConfigHome, { recursive: true })
})

after(() => {
  if (originalHome === undefined) delete process.env.HOME
  else process.env.HOME = originalHome

  if (originalXdgConfigHome === undefined) delete process.env.XDG_CONFIG_HOME
  else process.env.XDG_CONFIG_HOME = originalXdgConfigHome

  fs.rmSync(fakeHome, { recursive: true, force: true })
})

test('removeMarkedSection removes the mywiki block and preserves surrounding content', () => {
  const filePath = path.join(fakeHome, 'AGENTS.md')
  fs.writeFileSync(filePath, [
    'before',
    '',
    '<!-- mywiki:start -->',
    'legacy block',
    '<!-- mywiki:end -->',
    '',
    'after',
    '',
  ].join('\n'))

  const removed = __testing.removeMarkedSection(filePath)

  assert.equal(removed, true)
  assert.equal(fs.readFileSync(filePath, 'utf-8'), 'before\n\nafter\n')
})

test('safeRemove unlinks directory symlinks without touching the source directory', () => {
  const sourceDir = path.join(fakeHome, 'source-skill')
  const linkDir = path.join(fakeHome, 'linked-skill')

  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# source skill\n')
  fs.symlinkSync(sourceDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir')

  __testing.safeRemove(linkDir)

  assert.equal(fs.existsSync(linkDir), false)
  assert.equal(fs.readFileSync(path.join(sourceDir, 'SKILL.md'), 'utf-8'), '# source skill\n')
})

test('installDirectorySkill falls back to copy when link creation fails', () => {
  const skillStoreDir = path.join(fakeHome, 'store')
  const destDir = path.join(fakeHome, '.codex', 'skills', 'mywiki')

  fs.mkdirSync(skillStoreDir, { recursive: true })
  fs.writeFileSync(path.join(skillStoreDir, 'SKILL.md'), '# fallback skill\n')

  const originalSymlinkSync = fs.symlinkSync
  fs.symlinkSync = () => {
    throw new Error('simulated symlink failure')
  }

  try {
    const result = __testing.installDirectorySkill(skillStoreDir, destDir)
    assert.equal(result.mode, 'copy')
    assert.equal(fs.readFileSync(path.join(destDir, 'SKILL.md'), 'utf-8'), '# fallback skill\n')
  } finally {
    fs.symlinkSync = originalSymlinkSync
  }
})

test('installToTargets cleans legacy AGENTS injections for Codex and OpenCode', () => {
  const codexAgents = path.join(fakeHome, '.codex', 'AGENTS.md')
  const opencodeAgents = path.join(fakeXdgConfigHome, 'opencode', 'AGENTS.md')

  fs.mkdirSync(path.dirname(codexAgents), { recursive: true })
  fs.mkdirSync(path.dirname(opencodeAgents), { recursive: true })
  fs.writeFileSync(codexAgents, 'codex header\n\n<!-- mywiki:start -->\nlegacy\n<!-- mywiki:end -->\n\ncodex footer\n')
  fs.writeFileSync(opencodeAgents, 'opencode header\n\n<!-- mywiki:start -->\nlegacy\n<!-- mywiki:end -->\n\nopencode footer\n')

  const results = Object.fromEntries(installToTargets(['codex', 'opencode']).map(result => [result.id, result]))

  assert.equal(results.codex.removedLegacyInjection, true)
  assert.equal(results.opencode.removedLegacyInjection, true)
  assert.equal(fs.readFileSync(codexAgents, 'utf-8'), 'codex header\n\ncodex footer\n')
  assert.equal(fs.readFileSync(opencodeAgents, 'utf-8'), 'opencode header\n\nopencode footer\n')
  assert.ok(fs.existsSync(path.join(results.codex.dest, 'SKILL.md')))
  assert.ok(fs.existsSync(path.join(results.opencode.dest, 'SKILL.md')))
  assert.ok(fs.existsSync(path.join(fakeHome, '.mywiki', 'skills', 'mywiki', 'SKILL.md')))
})

test('legacy Cursor and Windsurf installs contain the flattened skill with config-driven wikiDir guidance', () => {
  const results = Object.fromEntries(installToTargets(['cursor', 'windsurf']).map(result => [result.id, result]))

  const cursorContent = fs.readFileSync(results.cursor.dest, 'utf-8')
  const windsurfContent = fs.readFileSync(results.windsurf.dest, 'utf-8')

  assert.match(cursorContent, /~\/\.mywiki\/config\.json/)
  assert.match(cursorContent, /wikiDir/)
  assert.match(windsurfContent, /<!-- mywiki:start -->/)
  assert.match(windsurfContent, /~\/\.mywiki\/config\.json/)
})
