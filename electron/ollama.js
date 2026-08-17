'use strict'

const { spawn, execFile } = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')

const DEFAULT_HOST = 'http://127.0.0.1:11434'

/** Loopback addresses to probe when the configured host is a local default. A
 *  server can end up on any of these depending on how it was started. */
const LOOPBACK_HOSTS = [
  'http://127.0.0.1:11434',
  'http://localhost:11434',
  'http://[::1]:11434',
]

/** Places Ollama commonly installs to, since GUI apps don't inherit a login shell PATH. */
function binaryCandidates() {
  const home = os.homedir()
  const env = process.env

  if (process.platform === 'win32') {
    // Built from the environment rather than hardcoded to C:, and covering the
    // installer, winget, Chocolatey and Scoop layouts.
    const roots = [
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs', 'Ollama'),
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Ollama'),
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links'),
      env.ProgramFiles && path.join(env.ProgramFiles, 'Ollama'),
      env.ProgramW6432 && path.join(env.ProgramW6432, 'Ollama'),
      env['ProgramFiles(x86)'] && path.join(env['ProgramFiles(x86)'], 'Ollama'),
      env.ProgramData && path.join(env.ProgramData, 'chocolatey', 'bin'),
      path.join(home, 'scoop', 'shims'),
      path.join(home, 'AppData', 'Local', 'Programs', 'Ollama'),
    ].filter(Boolean)
    return roots.map((root) => path.join(root, 'ollama.exe'))
  }

  return [
    '/usr/local/bin/ollama',
    '/opt/homebrew/bin/ollama',
    '/usr/bin/ollama',
    '/snap/bin/ollama',
    '/Applications/Ollama.app/Contents/Resources/ollama',
    path.join(home, '.ollama', 'bin', 'ollama'),
    path.join(home, '.local', 'bin', 'ollama'),
    path.join(home, 'Applications', 'Ollama.app', 'Contents', 'Resources', 'ollama'),
  ]
}

let serverProcess = null

/** Locate the ollama binary on disk, falling back to a PATH lookup. */
function findBinary() {
  for (const candidate of binaryCandidates()) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      return candidate
    } catch {
      /* keep looking */
    }
  }
  return null
}

/**
 * Windows writes PATH changes to the registry, but a running process keeps the
 * copy it was launched with. Installing Ollama while this app is open therefore
 * leaves `where` blind to it — so read the current PATH back before looking.
 */
function freshWindowsPath() {
  return new Promise((resolve) => {
    const keys = [
      ['HKCU\\Environment', 'Path'],
      ['HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', 'Path'],
    ]
    let pending = keys.length
    const found = []

    for (const [key, name] of keys) {
      execFile('reg', ['query', key, '/v', name], { timeout: 2500 }, (err, stdout) => {
        if (!err && stdout) {
          const match = String(stdout).match(/REG_(?:EXPAND_)?SZ\s+(.*)/)
          if (match) found.push(match[1].trim())
        }
        if (--pending === 0) {
          const merged = [process.env.PATH, ...found].filter(Boolean).join(path.delimiter)
          resolve(expandWindowsVars(merged))
        }
      })
    }
  })
}

function expandWindowsVars(value) {
  return value.replace(/%([^%]+)%/g, (whole, name) => process.env[name] ?? whole)
}

async function which() {
  const isWindows = process.platform === 'win32'
  const env = { ...process.env }
  if (isWindows) {
    try {
      env.PATH = await freshWindowsPath()
    } catch {
      /* stick with the inherited PATH */
    }
  }

  return new Promise((resolve) => {
    const cmd = isWindows ? 'where' : 'which'
    execFile(cmd, ['ollama'], { timeout: 3000, env }, (err, stdout) => {
      if (err || !stdout) return resolve(null)
      const first = String(stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0]
      resolve(first || null)
    })
  })
}

async function resolveBinary() {
  return findBinary() || (await which())
}

class OllamaClient {
  constructor(host = DEFAULT_HOST) {
    this.host = host.replace(/\/+$/, '')
    /** requestId -> AbortController, so the UI can stop generations and downloads. */
    this.inflight = new Map()
  }

  setHost(host) {
    if (host && typeof host === 'string') this.host = host.replace(/\/+$/, '')
  }

  url(pathname) {
    return `${this.host}${pathname}`
  }

  /** Probe one address. Kept separate so `isRunning` can sweep several. */
  async ping(host, timeoutMs = 1500) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(`${host}/api/version`, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) return null
      const body = await res.json().catch(() => ({}))
      return { version: body.version || null }
    } catch {
      return null
    }
  }

  /**
   * Addresses worth trying. A deliberately configured remote host is never
   * second-guessed; local defaults get swept because the server may be on
   * localhost, IPv6 loopback, or wherever OLLAMA_HOST points.
   */
  candidateHosts() {
    if (!LOOPBACK_HOSTS.includes(this.host)) return [this.host]

    const fromEnv = normalizeHost(process.env.OLLAMA_HOST)
    return [...new Set([this.host, ...(fromEnv ? [fromEnv] : []), ...LOOPBACK_HOSTS])]
  }

  /** Is the HTTP server answering right now, at any address we'd accept? */
  async isRunning(timeoutMs = 1500) {
    const hosts = this.candidateHosts()

    for (const host of hosts) {
      const hit = await this.ping(host, timeoutMs)
      if (hit) {
        // Remember where it actually answered so every later call goes there.
        if (host !== this.host) this.host = host
        return { running: true, version: hit.version, host }
      }
    }

    return { running: false, hostsTried: hosts }
  }

  async status() {
    const binary = await resolveBinary()
    const { running, version, hostsTried } = await this.isRunning()
    return {
      host: this.host,
      installed: Boolean(binary) || running,
      binary,
      running,
      version: version || null,
      hostsTried: hostsTried || [this.host],
      platform: process.platform,
    }
  }

  /** Spawn `ollama serve` detached and wait for the API to come up. */
  async startServer() {
    const already = await this.isRunning()
    if (already.running) return { started: true, alreadyRunning: true }

    const binary = await resolveBinary()
    if (!binary) {
      return {
        started: false,
        installed: false,
        error: 'Ollama is not installed on this computer yet.',
      }
    }

    try {
      serverProcess = spawn(binary, ['serve'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      })
      serverProcess.unref()
    } catch (err) {
      return { started: false, error: err.message }
    }

    // Ollama needs a moment to bind the port; poll instead of guessing a delay.
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 400))
      const check = await this.isRunning(800)
      if (check.running) return { started: true, alreadyRunning: false, version: check.version }
    }
    return { started: false, error: 'Ollama did not start responding in time.' }
  }

  async request(pathname, options = {}) {
    const res = await fetch(this.url(pathname), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(extractErrorMessage(text) || `${res.status} ${res.statusText}`)
    }
    return res
  }

  /**
   * Model list, enriched with each model's declared capabilities so the UI can
   * tell what actually supports images rather than guessing from the name.
   */
  async listModels({ withCapabilities = true } = {}) {
    const res = await this.request('/api/tags')
    const body = await res.json()
    const models = (body.models || []).map(normalizeModel)

    if (withCapabilities) {
      await Promise.all(
        models.map(async (model) => {
          try {
            const info = await this.showModel(model.name)
            model.capabilities = info.capabilities || []
            const architecture = info.modelInfo?.['general.architecture']
            const contextLength = architecture ? info.modelInfo?.[`${architecture}.context_length`] : null
            if (contextLength) model.contextLength = Number(contextLength)
          } catch {
            // Fall back to name-based detection for this one.
            model.capabilities = null
          }
        }),
      )
    }

    return models
  }

  /** Models currently loaded into RAM/VRAM. */
  async listRunning() {
    try {
      const res = await this.request('/api/ps')
      const body = await res.json()
      return (body.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        sizeVram: m.size_vram,
        expiresAt: m.expires_at,
      }))
    } catch {
      return []
    }
  }

  async showModel(name) {
    const res = await this.request('/api/show', {
      method: 'POST',
      body: JSON.stringify({ model: name }),
    })
    const body = await res.json()
    return {
      name,
      license: body.license || null,
      modelfile: body.modelfile || null,
      parameters: body.parameters || null,
      template: body.template || null,
      details: body.details || {},
      modelInfo: body.model_info || {},
      capabilities: body.capabilities || [],
    }
  }

  async deleteModel(name) {
    await this.request('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ model: name }),
    })
    return { ok: true }
  }

  async copyModel(source, destination) {
    await this.request('/api/copy', {
      method: 'POST',
      body: JSON.stringify({ source, destination }),
    })
    return { ok: true }
  }

  /** Create a derived model (custom system prompt / parameters) from a base model. */
  async createModel({ name, from, system, parameters = {} }, onProgress) {
    const controller = new AbortController()
    this.inflight.set(`create:${name}`, controller)
    try {
      const res = await fetch(this.url('/api/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ model: name, from, system, parameters, stream: true }),
      })
      if (!res.ok) throw new Error((await res.text()) || res.statusText)
      for await (const event of streamJson(res)) {
        if (onProgress) onProgress(event)
      }
      return { ok: true }
    } finally {
      this.inflight.delete(`create:${name}`)
    }
  }

  /** Download a model, reporting byte-level progress as it goes. */
  async pullModel(name, onProgress) {
    const key = `pull:${name}`
    const controller = new AbortController()
    this.inflight.set(key, controller)
    try {
      const res = await fetch(this.url('/api/pull'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ model: name, stream: true }),
      })
      if (!res.ok) throw new Error((await res.text()) || res.statusText)

      for await (const event of streamJson(res)) {
        if (event.error) throw new Error(event.error)
        if (onProgress) {
          onProgress({
            model: name,
            status: event.status || '',
            digest: event.digest || null,
            total: event.total || 0,
            completed: event.completed || 0,
          })
        }
      }
      return { ok: true, model: name }
    } catch (err) {
      if (err.name === 'AbortError') return { ok: false, canceled: true, model: name }
      throw err
    } finally {
      this.inflight.delete(key)
    }
  }

  /**
   * Stream a chat completion. `messages` may carry `images` (base64, no data-url prefix)
   * for vision-capable models.
   */
  async chat({ requestId, model, messages, options = {}, keepAlive }, onEvent) {
    const controller = new AbortController()
    this.inflight.set(requestId, controller)
    try {
      const res = await fetch(this.url('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options,
          ...(keepAlive ? { keep_alive: keepAlive } : {}),
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(extractErrorMessage(text) || `${res.status} ${res.statusText}`)
      }

      for await (const event of streamJson(res)) {
        if (event.error) throw new Error(extractErrorMessage(event.error))

        const delta = event.message?.content || ''
        const thinking = event.message?.thinking || ''
        if (delta || thinking) onEvent({ type: 'delta', delta, thinking })

        if (event.done) {
          onEvent({
            type: 'done',
            stats: {
              totalDuration: event.total_duration,
              loadDuration: event.load_duration,
              promptEvalCount: event.prompt_eval_count,
              promptEvalDuration: event.prompt_eval_duration,
              evalCount: event.eval_count,
              evalDuration: event.eval_duration,
              doneReason: event.done_reason,
            },
          })
        }
      }
      return { ok: true }
    } catch (err) {
      if (err.name === 'AbortError') {
        onEvent({ type: 'aborted' })
        return { ok: false, aborted: true }
      }
      onEvent({ type: 'error', error: err.message })
      return { ok: false, error: err.message }
    } finally {
      this.inflight.delete(requestId)
    }
  }

  /** One-shot, non-streaming completion — used for auto-titling chats. */
  async generateOnce({ model, prompt, system, options = {} }) {
    const res = await this.request('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, system, stream: false, options }),
    })
    const body = await res.json()
    return body.response || ''
  }

  async embed({ model, input }) {
    const res = await this.request('/api/embed', {
      method: 'POST',
      body: JSON.stringify({ model, input }),
    })
    return res.json()
  }

  abort(requestId) {
    const controller = this.inflight.get(requestId)
    if (!controller) return { ok: false }
    controller.abort()
    this.inflight.delete(requestId)
    return { ok: true }
  }

  abortAll() {
    for (const controller of this.inflight.values()) {
      try {
        controller.abort()
      } catch {
        /* best effort */
      }
    }
    this.inflight.clear()
  }
}

/** Ollama streams newline-delimited JSON; yield one parsed object per line. */
async function* streamJson(res) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line) continue
        try {
          yield JSON.parse(line)
        } catch {
          /* partial or non-JSON keepalive line; skip it */
        }
      }
    }
    const tail = buffer.trim()
    if (tail) {
      try {
        yield JSON.parse(tail)
      } catch {
        /* ignore trailing garbage */
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* stream already closed */
    }
  }
}

/**
 * Ollama reports failures as JSON, sometimes with another JSON document nested
 * inside the `error` string. Dig out the human-readable sentence so the UI never
 * shows a wall of escaped braces.
 */
function extractErrorMessage(input, depth = 0) {
  if (input == null) return ''
  if (depth > 5) return String(input)

  if (typeof input === 'object') {
    if (typeof input.message === 'string') return extractErrorMessage(input.message, depth + 1)
    if (input.error !== undefined) return extractErrorMessage(input.error, depth + 1)
    return String(input)
  }

  const text = String(input).trim()
  if (!text) return ''

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return extractErrorMessage(JSON.parse(text), depth + 1)
    } catch {
      /* not JSON after all — fall through */
    }
  }

  return text
}

/** OLLAMA_HOST is often set bare, e.g. `127.0.0.1:11434` or just a port. */
function normalizeHost(value) {
  if (!value || typeof value !== 'string') return null
  let host = value.trim().replace(/\/+$/, '')
  if (!host) return null
  if (/^\d+$/.test(host)) host = `127.0.0.1:${host}`
  if (!/^https?:\/\//.test(host)) host = `http://${host}`
  if (!/:\d+$/.test(host)) host = `${host}:11434`
  return host
}

function normalizeModel(m) {
  const details = m.details || {}
  return {
    name: m.name,
    model: m.model || m.name,
    size: m.size || 0,
    digest: m.digest,
    modifiedAt: m.modified_at,
    family: details.family || '',
    families: details.families || [],
    parameterSize: details.parameter_size || '',
    quantization: details.quantization_level || '',
    format: details.format || '',
    capabilities: null,
    contextLength: null,
  }
}

module.exports = { OllamaClient, DEFAULT_HOST, resolveBinary, extractErrorMessage }
