export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

export function formatRelative(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** ChatGPT-style buckets for the sidebar chat list. */
export function bucketFor(iso) {
  if (!iso) return 'Older'
  const then = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = then.getTime()

  if (t >= startOfToday) return 'Today'
  if (t >= startOfToday - 86_400_000) return 'Yesterday'
  if (t >= startOfToday - 7 * 86_400_000) return 'Previous 7 days'
  if (t >= startOfToday - 30 * 86_400_000) return 'Previous 30 days'
  return then.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export const BUCKET_ORDER = ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days']

export function groupChats(chats) {
  const groups = new Map()
  for (const chat of chats) {
    const key = chat.pinned ? 'Pinned' : bucketFor(chat.updatedAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(chat)
  }

  const ordered = []
  for (const key of BUCKET_ORDER) {
    if (groups.has(key)) {
      ordered.push([key, groups.get(key)])
      groups.delete(key)
    }
  }
  for (const [key, value] of groups) ordered.push([key, value])
  return ordered
}

/** Tokens/sec from Ollama's nanosecond timings. */
export function tokensPerSecond(stats) {
  if (!stats?.evalCount || !stats?.evalDuration) return null
  return stats.evalCount / (stats.evalDuration / 1e9)
}

export function formatDuration(nanoseconds) {
  if (!nanoseconds) return ''
  const seconds = nanoseconds / 1e9
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  return `${seconds.toFixed(1)}s`
}

/** Rough heuristic — good enough for a context-usage meter, not billing. */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(String(text).length / 4)
}

export function titleFromText(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim()
  if (!flat) return 'New chat'
  const clipped = flat.slice(0, 48)
  return clipped.length < flat.length ? `${clipped}…` : clipped
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

/** Strip the `data:image/png;base64,` prefix Ollama doesn't want. */
export function stripDataUrl(dataUrl) {
  const comma = String(dataUrl).indexOf(',')
  return comma >= 0 ? String(dataUrl).slice(comma + 1) : String(dataUrl)
}

/** Family/name heuristics for models that accept images. */
const VISION_HINTS = [
  'llava', 'vision', 'bakllava', 'moondream', 'minicpm-v', 'llama3.2-vision',
  'qwen2-vl', 'qwen2.5vl', 'qwen3-vl', 'gemma3', 'mistral-small3', 'granite3.2-vision',
  'internvl', 'pixtral', 'cogvlm', 'glm-4v',
]

/**
 * Ollama reports capabilities per model, which is authoritative — gemma3:4b reads
 * images but gemma3:1b doesn't, and no name heuristic can tell them apart. Only
 * fall back to name matching when capabilities couldn't be fetched.
 */
export function isVisionModel(model) {
  if (!model) return false
  if (Array.isArray(model.capabilities)) return model.capabilities.includes('vision')
  const haystack = `${model.name || ''} ${model.family || ''} ${(model.families || []).join(' ')}`.toLowerCase()
  return VISION_HINTS.some((hint) => haystack.includes(hint))
}

const REASONING_HINTS = ['deepseek-r1', 'qwq', 'marco-o1', 'openthinker', 'reasoner', 'magistral', 'gpt-oss', 'phi4-reasoning']

export function isReasoningModel(model) {
  const haystack = `${model?.name || ''} ${model?.family || ''}`.toLowerCase()
  return REASONING_HINTS.some((hint) => haystack.includes(hint))
}

const EMBEDDING_HINTS = ['embed', 'bge-', 'e5-', 'minilm', 'gte-']

export function isEmbeddingModel(model) {
  const name = String(model?.name || '').toLowerCase()
  return EMBEDDING_HINTS.some((hint) => name.includes(hint))
}

/** "llama3.2:3b" -> { base: "llama3.2", tag: "3b" } */
export function splitModelName(name) {
  const [base, tag = 'latest'] = String(name || '').split(':')
  return { base, tag }
}

export function prettyModelName(name) {
  const { base, tag } = splitModelName(name)
  const label = base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return tag && tag !== 'latest' ? `${label} ${tag}` : label
}
