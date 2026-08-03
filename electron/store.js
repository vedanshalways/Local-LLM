'use strict'

const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

/**
 * Everything lives as plain JSON on disk under the app's userData dir:
 *   chats/<id>.json   one file per conversation
 *   settings.json     app preferences
 * No database, no network — chats never leave the machine.
 */
/** Folders this app used before it was renamed, newest first. */
const LEGACY_DIR_NAMES = ['local-llm-studio', 'Local LLM Studio']

/**
 * The userData path is derived from the app name, so renaming the app would
 * otherwise strand existing chats in the old folder. Copy them across once —
 * copy rather than move, so the old data survives if anything goes wrong.
 */
function migrateLegacyData(baseDir) {
  if (fs.existsSync(path.join(baseDir, 'chats'))) return

  const parent = path.dirname(baseDir)
  for (const legacyName of LEGACY_DIR_NAMES) {
    const legacyDir = path.join(parent, legacyName)
    if (legacyDir === baseDir) continue
    if (!fs.existsSync(path.join(legacyDir, 'chats'))) continue

    try {
      fs.mkdirSync(baseDir, { recursive: true })
      for (const entry of ['chats', 'settings.json']) {
        const from = path.join(legacyDir, entry)
        const to = path.join(baseDir, entry)
        if (fs.existsSync(from) && !fs.existsSync(to)) {
          fs.cpSync(from, to, { recursive: true })
        }
      }
      console.log(`Migrated saved chats from ${legacyDir}`)
    } catch (err) {
      console.error('Could not migrate previous data:', err.message)
    }
    return
  }
}

class LocalStore {
  constructor(baseDir) {
    this.baseDir = baseDir
    this.chatsDir = path.join(baseDir, 'chats')
    this.settingsPath = path.join(baseDir, 'settings.json')
    this.indexCache = null
    migrateLegacyData(baseDir)
    fs.mkdirSync(this.chatsDir, { recursive: true })
  }

  // ---------------------------------------------------------------- settings

  get defaultSettings() {
    return {
      theme: 'light',
      accent: 'indigo',
      ollamaHost: 'http://127.0.0.1:11434',
      defaultModel: '',
      systemPrompt: '',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      numCtx: 4096,
      numPredict: -1,
      keepAlive: '5m',
      streamResponses: true,
      autoTitle: true,
      sendOnEnter: true,
      showTokenStats: true,
      fontSize: 'medium',
      autoStartServer: true,
    }
  }

  async getSettings() {
    try {
      const raw = await fsp.readFile(this.settingsPath, 'utf8')
      return { ...this.defaultSettings, ...JSON.parse(raw) }
    } catch {
      return { ...this.defaultSettings }
    }
  }

  async saveSettings(patch) {
    const current = await this.getSettings()
    const next = { ...current, ...patch }
    await writeAtomic(this.settingsPath, JSON.stringify(next, null, 2))
    return next
  }

  // ------------------------------------------------------------------ chats

  chatPath(id) {
    // Guard against a malformed id escaping the chats directory.
    const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safe) throw new Error('Invalid chat id')
    return path.join(this.chatsDir, `${safe}.json`)
  }

  async listChats() {
    const files = await fsp.readdir(this.chatsDir).catch(() => [])
    const chats = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await fsp.readFile(path.join(this.chatsDir, file), 'utf8')
        const chat = JSON.parse(raw)
        chats.push({
          id: chat.id,
          title: chat.title || 'New chat',
          model: chat.model || '',
          pinned: Boolean(chat.pinned),
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messageCount: (chat.messages || []).length,
          preview: previewOf(chat),
        })
      } catch {
        /* skip unreadable/corrupt file rather than failing the whole list */
      }
    }

    chats.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    })
    return chats
  }

  async getChat(id) {
    try {
      const raw = await fsp.readFile(this.chatPath(id), 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async createChat({ title = 'New chat', model = '', systemPrompt = '' } = {}) {
    const now = new Date().toISOString()
    const chat = {
      id: crypto.randomUUID(),
      title,
      model,
      systemPrompt,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    await writeAtomic(this.chatPath(chat.id), JSON.stringify(chat, null, 2))
    return chat
  }

  async saveChat(chat) {
    if (!chat || !chat.id) throw new Error('Chat must have an id')
    const next = { ...chat, updatedAt: new Date().toISOString() }
    await writeAtomic(this.chatPath(chat.id), JSON.stringify(next, null, 2))
    return next
  }

  async patchChat(id, patch) {
    const chat = await this.getChat(id)
    if (!chat) return null
    return this.saveChat({ ...chat, ...patch })
  }

  async deleteChat(id) {
    await fsp.unlink(this.chatPath(id)).catch(() => {})
    return { ok: true }
  }

  async deleteAllChats() {
    const files = await fsp.readdir(this.chatsDir).catch(() => [])
    await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => fsp.unlink(path.join(this.chatsDir, f)).catch(() => {})),
    )
    return { ok: true }
  }

  /** Substring search across titles and message bodies. */
  async searchChats(query) {
    const needle = String(query || '').toLowerCase().trim()
    if (!needle) return this.listChats()

    const files = await fsp.readdir(this.chatsDir).catch(() => [])
    const hits = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const chat = JSON.parse(await fsp.readFile(path.join(this.chatsDir, file), 'utf8'))
        const inTitle = (chat.title || '').toLowerCase().includes(needle)
        const match = (chat.messages || []).find((m) =>
          String(m.content || '').toLowerCase().includes(needle),
        )
        if (inTitle || match) {
          hits.push({
            id: chat.id,
            title: chat.title || 'New chat',
            model: chat.model || '',
            pinned: Boolean(chat.pinned),
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            messageCount: (chat.messages || []).length,
            preview: match ? snippet(match.content, needle) : previewOf(chat),
          })
        }
      } catch {
        /* skip corrupt file */
      }
    }

    hits.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    return hits
  }

  async exportAll() {
    const files = await fsp.readdir(this.chatsDir).catch(() => [])
    const chats = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        chats.push(JSON.parse(await fsp.readFile(path.join(this.chatsDir, file), 'utf8')))
      } catch {
        /* skip corrupt file */
      }
    }
    return {
      app: 'Local Graph',
      exportedAt: new Date().toISOString(),
      settings: await this.getSettings(),
      chats,
    }
  }

  async importAll(payload) {
    const chats = Array.isArray(payload?.chats) ? payload.chats : []
    let imported = 0
    for (const chat of chats) {
      if (!chat || !Array.isArray(chat.messages)) continue
      const id = /^[a-zA-Z0-9_-]+$/.test(String(chat.id || '')) ? chat.id : crypto.randomUUID()
      await writeAtomic(this.chatPath(id), JSON.stringify({ ...chat, id }, null, 2))
      imported++
    }
    return { imported }
  }

  async stats() {
    const chats = await this.listChats()
    const messages = chats.reduce((sum, c) => sum + c.messageCount, 0)
    let bytes = 0
    const files = await fsp.readdir(this.chatsDir).catch(() => [])
    for (const file of files) {
      try {
        bytes += (await fsp.stat(path.join(this.chatsDir, file))).size
      } catch {
        /* ignore */
      }
    }
    return { chats: chats.length, messages, bytes, location: this.baseDir }
  }
}

/** Write via a temp file + rename so a crash mid-write can't truncate a chat. */
async function writeAtomic(filePath, contents) {
  const tmp = `${filePath}.${process.pid}.tmp`
  await fsp.writeFile(tmp, contents, 'utf8')
  await fsp.rename(tmp, filePath)
}

function previewOf(chat) {
  const last = [...(chat.messages || [])].reverse().find((m) => m.content)
  if (!last) return ''
  return String(last.content).replace(/\s+/g, ' ').slice(0, 120)
}

function snippet(text, needle) {
  const flat = String(text).replace(/\s+/g, ' ')
  const at = flat.toLowerCase().indexOf(needle)
  if (at < 0) return flat.slice(0, 120)
  const start = Math.max(0, at - 40)
  return (start > 0 ? '…' : '') + flat.slice(start, start + 120)
}

module.exports = { LocalStore }
