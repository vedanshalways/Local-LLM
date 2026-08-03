import { useEffect, useMemo, useState, useCallback } from 'react'

import { Modal, ProgressBar, EmptyState, Spinner, Field, useToast, CopyButton } from './ui.jsx'
import {
  Search, Boxes, Download, Trash, Play, Eye, Brain, Layers, HardDrive, Cpu, Info,
  Plus, X, Bolt, Globe, Check,
} from '../lib/icons.jsx'
import { CATALOG, CATEGORIES } from '../lib/catalog.js'
import {
  formatBytes, formatRelative, classNames, isVisionModel, isReasoningModel,
  isEmbeddingModel, splitModelName,
} from '../lib/format.js'

export default function ModelsPage({
  models,
  loaded,
  systemInfo,
  onRefresh,
  onChatWithModel,
  defaultModel,
  onSetDefaultModel,
  serverRunning,
  onOpenSetup,
  category = 'all',
  onCategoryChange,
}) {
  const toast = useToast()
  const [tab, setTab] = useState('installed')
  const [query, setQuery] = useState('')
  const setCategory = onCategoryChange
  const [pulls, setPulls] = useState({}) // tag -> {status, completed, total, percent}
  const [details, setDetails] = useState(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customTag, setCustomTag] = useState('')

  // Byte-level download progress streams in from the main process.
  useEffect(() => {
    return window.api.ollama.onPullProgress((progress) => {
      setPulls((prev) => {
        const percent = progress.total > 0 ? (progress.completed / progress.total) * 100 : prev[progress.model]?.percent || 0
        return {
          ...prev,
          [progress.model]: {
            status: progress.status,
            completed: progress.completed,
            total: progress.total,
            percent,
          },
        }
      })
    })
  }, [])

  // Arriving with a filter (e.g. "get a vision model") should land on Discover
  // when nothing installed matches, rather than on an empty Installed tab.
  useEffect(() => {
    if (category === 'all') return
    const anyInstalled = models.some((model) => matchesCategory(model, category))
    if (!anyInstalled) setTab('discover')
  }, [category, models])

  const installedNames = useMemo(() => new Set(models.map((m) => m.name)), [models])
  const loadedNames = useMemo(() => new Set(loaded.map((m) => m.name)), [loaded])

  const pull = useCallback(
    async (tag) => {
      setPulls((prev) => ({ ...prev, [tag]: { status: 'starting', percent: 0, completed: 0, total: 0 } }))
      try {
        const result = await window.api.ollama.pull(tag)
        if (result?.canceled) {
          toast(`Download of ${tag} canceled.`)
        } else {
          toast(`${tag} is ready to use.`, 'success')
        }
        await onRefresh()
      } catch (err) {
        toast(`Couldn't download ${tag}: ${err.message}`, 'error', 8000)
      } finally {
        setPulls((prev) => {
          const next = { ...prev }
          delete next[tag]
          return next
        })
      }
    },
    [onRefresh, toast],
  )

  const cancelPull = useCallback(async (tag) => {
    await window.api.ollama.cancelPull(tag)
  }, [])

  const remove = useCallback(
    async (name) => {
      const { confirmed } = await window.api.app.confirm({
        title: 'Delete model',
        message: `Delete ${name}?`,
        detail: 'The model files are removed from this computer. You can download it again at any time.',
      })
      if (!confirmed) return

      try {
        await window.api.ollama.remove(name)
        toast(`${name} deleted.`, 'success')
        await onRefresh()
      } catch (err) {
        toast(`Couldn't delete ${name}: ${err.message}`, 'error')
      }
    },
    [onRefresh, toast],
  )

  const openDetails = useCallback(
    async (name) => {
      setDetails({ name, loading: true })
      try {
        const info = await window.api.ollama.show(name)
        setDetails({ ...info, loading: false })
      } catch (err) {
        setDetails(null)
        toast(`Couldn't load details: ${err.message}`, 'error')
      }
    },
    [toast],
  )

  const totalSize = models.reduce((sum, m) => sum + (m.size || 0), 0)

  // ------------------------------------------------------------- filtering

  const needle = query.trim().toLowerCase()

  const filteredInstalled = models.filter((model) => {
    if (needle && !model.name.toLowerCase().includes(needle) && !(model.family || '').toLowerCase().includes(needle)) {
      return false
    }
    return matchesCategory(model, category)
  })

  const filteredCatalog = CATALOG.filter((entry) => {
    if (category !== 'all' && !entry.categories.includes(category)) return false
    if (!needle) return true
    const haystack = `${entry.name} ${entry.publisher} ${entry.description} ${entry.variants.map((v) => v.tag).join(' ')}`
    return haystack.toLowerCase().includes(needle)
  })

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Models</div>
        <div className="topbar-spacer" />
        <button className="btn sm ghost" onClick={onRefresh}>
          Refresh
        </button>
        <button className="btn sm" onClick={() => setCustomOpen(true)}>
          <Plus size={15} />
          Add by name
        </button>
      </div>

      <div className="page-scroll">
        <div className="page-inner">
          <div className="page-head">
            <h1 className="page-title">Model library</h1>
            <p className="page-sub">
              Everything here runs on your own hardware. Download a model once and it works offline, forever.
            </p>
          </div>

          {!serverRunning && (
            <div className="banner" style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,165,36,.28)', marginBottom: 24 }}>
              <Info size={16} />
              <span className="banner-spacer">
                Downloads need the local engine running. Everything else on this page still works.
              </span>
              <button onClick={onOpenSetup}>Set it up</button>
            </div>
          )}

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label"><Layers size={13} /> Installed</div>
              <div className="stat-value">{models.length}</div>
              <div className="stat-sub">{models.length === 1 ? 'model' : 'models'} on this machine</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><HardDrive size={13} /> Disk used</div>
              <div className="stat-value">{formatBytes(totalSize)}</div>
              <div className="stat-sub">across all models</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><Bolt size={13} /> Loaded now</div>
              <div className="stat-value">{loaded.length}</div>
              <div className="stat-sub">{loaded.length ? loaded.map((m) => m.name).join(', ') : 'nothing in memory'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><Cpu size={13} /> This computer</div>
              <div className="stat-value">{systemInfo?.totalMemoryGB ? `${systemInfo.totalMemoryGB} GB` : '—'}</div>
              <div className="stat-sub">{systemInfo ? `${systemInfo.cpus} cores · ${systemInfo.arch}` : 'RAM available'}</div>
            </div>
          </div>

          <div className="tabs">
            <button className={classNames('tab', tab === 'installed' && 'active')} onClick={() => setTab('installed')}>
              Installed<span className="tab-count">{models.length}</span>
            </button>
            <button className={classNames('tab', tab === 'discover' && 'active')} onClick={() => setTab('discover')}>
              Discover<span className="tab-count">{CATALOG.length}</span>
            </button>
          </div>

          <div className="toolbar">
            <div className="search-input">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'installed' ? 'Search installed models…' : 'Search available models…'}
              />
              {query && (
                <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setQuery('')}>
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="filter-pills">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={classNames('pill', category === cat.id && 'active')}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'installed' ? (
            filteredInstalled.length === 0 ? (
              <EmptyState
                icon={<Boxes size={26} />}
                title={models.length === 0 ? 'No models installed yet' : 'Nothing matches that filter'}
                description={
                  models.length === 0
                    ? 'Download your first model from the Discover tab. Llama 3.2 3B is a good place to start — about 2 GB and quick on most laptops.'
                    : 'Try a different search term or category.'
                }
                action={
                  models.length === 0 ? (
                    <button className="btn accent" onClick={() => setTab('discover')}>
                      <Download size={16} />
                      Browse available models
                    </button>
                  ) : null
                }
              />
            ) : (
              <div className="model-grid">
                {filteredInstalled.map((model) => (
                  <InstalledCard
                    key={model.name}
                    model={model}
                    loaded={loadedNames.has(model.name)}
                    isDefault={defaultModel === model.name}
                    onChat={() => onChatWithModel(model.name)}
                    onDelete={() => remove(model.name)}
                    onDetails={() => openDetails(model.name)}
                    onSetDefault={() => onSetDefaultModel(model.name)}
                  />
                ))}
              </div>
            )
          ) : filteredCatalog.length === 0 ? (
            <EmptyState
              icon={<Globe size={26} />}
              title="No matching models"
              description="You can still install any model from the Ollama library by name — use “Add by name” in the top right."
              action={
                <button className="btn" onClick={() => setCustomOpen(true)}>
                  <Plus size={16} />
                  Add by name
                </button>
              }
            />
          ) : (
            <div className="model-grid">
              {filteredCatalog.map((entry) => (
                <CatalogCard
                  key={entry.id}
                  entry={entry}
                  installedNames={installedNames}
                  pulls={pulls}
                  onPull={pull}
                  onCancel={cancelPull}
                  onChat={onChatWithModel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomPullModal
        open={customOpen}
        value={customTag}
        onChange={setCustomTag}
        onClose={() => setCustomOpen(false)}
        onSubmit={(tag) => {
          setCustomOpen(false)
          setCustomTag('')
          setTab('installed')
          pull(tag)
        }}
        pulls={pulls}
      />

      <DetailsModal details={details} onClose={() => setDetails(null)} />
    </>
  )
}

function matchesCategory(model, category) {
  if (category === 'all') return true
  if (category === 'vision') return isVisionModel(model)
  if (category === 'reasoning') return isReasoningModel(model)
  if (category === 'embedding') return isEmbeddingModel(model)
  if (category === 'code') return /coder|code/.test(model.name.toLowerCase())
  if (category === 'small') return /(:0\.|:1\.|:1b|:2b|:3b|135m|360m)/.test(model.name.toLowerCase())
  return true
}

// ------------------------------------------------------------------- cards

function InstalledCard({ model, loaded, isDefault, onChat, onDelete, onDetails, onSetDefault }) {
  const vision = isVisionModel(model)
  const reasoning = isReasoningModel(model)
  const embedding = isEmbeddingModel(model)
  const { base } = splitModelName(model.name)

  return (
    <div className="model-card">
      <div className="model-card-top">
        <div className="model-avatar">
          {embedding ? <Layers size={19} /> : vision ? <Eye size={19} /> : reasoning ? <Brain size={19} /> : <Boxes size={19} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="model-name">{model.name}</div>
          <div className="model-meta">
            {[model.parameterSize, model.quantization, formatBytes(model.size)].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div className="badge-row">
        {loaded && <span className="badge loaded">In memory</span>}
        {isDefault && <span className="badge">Default</span>}
        {vision && <span className="badge vision"><Eye size={10} /> Vision</span>}
        {reasoning && <span className="badge reasoning"><Brain size={10} /> Reasoning</span>}
        {embedding && <span className="badge embedding">Embeddings</span>}
        {model.family && <span className="badge">{model.family}</span>}
      </div>

      <div className="model-meta">
        {base} · updated {formatRelative(model.modifiedAt)}
      </div>

      <div className="model-card-actions">
        {!embedding && (
          <button className="btn sm primary" onClick={onChat}>
            <Play size={13} />
            Chat
          </button>
        )}
        {!embedding && !isDefault && (
          <button className="btn sm" onClick={onSetDefault} title="Use this model for new chats">
            Set default
          </button>
        )}
        <div className="row" style={{ gap: 4, marginLeft: 'auto' }}>
          <button className="btn sm ghost" onClick={onDetails} title="Model details" aria-label="Model details">
            <Info size={15} />
          </button>
          <button className="btn sm ghost danger" onClick={onDelete} title="Delete model" aria-label="Delete model">
            <Trash size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CatalogCard({ entry, installedNames, pulls, onPull, onCancel, onChat }) {
  return (
    <div className="model-card">
      <div className="model-card-top">
        <div className="model-avatar">
          {entry.vision ? <Eye size={19} /> : entry.reasoning ? <Brain size={19} /> : entry.embedding ? <Layers size={19} /> : <Boxes size={19} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="model-name">{entry.name}</div>
          <div className="model-meta">by {entry.publisher}</div>
        </div>
      </div>

      <div className="badge-row">
        {entry.vision && <span className="badge vision"><Eye size={10} /> Vision</span>}
        {entry.reasoning && <span className="badge reasoning"><Brain size={10} /> Reasoning</span>}
        {entry.embedding && <span className="badge embedding">Embeddings</span>}
      </div>

      <div className="model-desc">{entry.description}</div>

      <div className="variant-list">
        {entry.variants.map((variant) => {
          const installed = installedNames.has(variant.tag)
          const progress = pulls[variant.tag]

          return (
            <div className="variant-row" key={variant.tag}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vr-head">
                  <span className="vr-label">{variant.label}</span>
                  <span className="vr-meta">{variant.size}</span>
                  {variant.recommended && <span className="badge">Recommended</span>}
                  {installed && !progress && <span className="badge installed"><Check size={10} /> Installed</span>}
                </div>
                {progress ? (
                  <div style={{ marginTop: 7 }}>
                    <ProgressBar value={progress.percent} indeterminate={!progress.total} />
                    <div className="pull-status">
                      <span>{progress.status || 'downloading'}</span>
                      <span>
                        {progress.total
                          ? `${formatBytes(progress.completed)} / ${formatBytes(progress.total)} · ${Math.round(progress.percent)}%`
                          : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="vr-meta" style={{ marginTop: 3 }}>Needs ~{variant.ram} RAM</div>
                )}
              </div>

              {progress ? (
                <button className="btn sm danger" onClick={() => onCancel(variant.tag)}>
                  Cancel
                </button>
              ) : installed ? (
                <button className="btn sm" onClick={() => onChat(variant.tag)}>
                  <Play size={13} />
                  Chat
                </button>
              ) : (
                <button className="btn sm accent" onClick={() => onPull(variant.tag)}>
                  <Download size={14} />
                  Get
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ modals

function CustomPullModal({ open, value, onChange, onClose, onSubmit, pulls }) {
  const trimmed = value.trim()
  const busy = Boolean(pulls[trimmed])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a model by name"
      size="narrow"
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={!trimmed || busy} onClick={() => onSubmit(trimmed)}>
            <Download size={15} />
            Download
          </button>
        </>
      }
    >
      <div className="modal-body">
        <Field
          label="Model name"
          hint="Any model from the Ollama library works — including ones not listed in Discover. Include a tag to pick a size, for example llama3.1:8b."
        >
          <input
            className="text-input mono"
            value={value}
            placeholder="e.g. llama3.2:3b"
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) onSubmit(trimmed)
            }}
          />
        </Field>

        <div className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe size={13} />
          <button
            style={{ textDecoration: 'underline', color: 'var(--accent)' }}
            onClick={() => window.api.app.openExternal('https://ollama.com/library')}
          >
            Browse the full model library
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DetailsModal({ details, onClose }) {
  if (!details) return null

  const info = details.modelInfo || {}
  const meta = details.details || {}
  const architecture = info['general.architecture']
  const contextLength = info[`${architecture}.context_length`]
  const paramCount = info['general.parameter_count']

  return (
    <Modal open onClose={onClose} title={details.name} size="wide">
      <div className="modal-body">
        {details.loading ? (
          <div className="row" style={{ justifyContent: 'center', padding: 40 }}>
            <Spinner accent />
          </div>
        ) : (
          <>
            <div className="detail-section">
              <h4>Overview</h4>
              <dl className="info-grid">
                <dt>Architecture</dt>
                <dd>{architecture || meta.family || '—'}</dd>
                <dt>Parameters</dt>
                <dd>{meta.parameter_size || (paramCount ? `${(paramCount / 1e9).toFixed(1)}B` : '—')}</dd>
                <dt>Quantization</dt>
                <dd>{meta.quantization_level || '—'}</dd>
                <dt>Context length</dt>
                <dd>{contextLength ? `${Number(contextLength).toLocaleString()} tokens` : '—'}</dd>
                <dt>Format</dt>
                <dd>{meta.format || '—'}</dd>
                <dt>Capabilities</dt>
                <dd>{details.capabilities?.length ? details.capabilities.join(', ') : '—'}</dd>
              </dl>
            </div>

            {details.parameters && (
              <div className="detail-section">
                <h4>Default parameters</h4>
                <pre className="pre-scroll">{details.parameters}</pre>
              </div>
            )}

            {details.template && (
              <div className="detail-section">
                <h4>Prompt template</h4>
                <pre className="pre-scroll">{details.template}</pre>
              </div>
            )}

            {details.modelfile && (
              <div className="detail-section">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0 }}>Modelfile</h4>
                  <CopyButton text={details.modelfile} className="btn sm ghost" showLabel label="Copy" size={13} />
                </div>
                <pre className="pre-scroll" style={{ marginTop: 10 }}>{details.modelfile}</pre>
              </div>
            )}

            {details.license && (
              <div className="detail-section">
                <h4>License</h4>
                <pre className="pre-scroll" style={{ maxHeight: 140 }}>{details.license}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
