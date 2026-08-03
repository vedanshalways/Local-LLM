import { useEffect, useState } from 'react'

import { Modal, SwitchRow, Segmented, Slider, Field, useToast } from './ui.jsx'
import { Settings as SettingsIcon, Brain, HardDrive, Info, Sun, Moon, Cpu, Folder, Download, Trash } from '../lib/icons.jsx'
import { formatBytes, classNames } from '../lib/format.js'

const SECTIONS = [
  { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
  { id: 'model', label: 'Model', icon: <Brain size={16} /> },
  { id: 'server', label: 'Server', icon: <Cpu size={16} /> },
  { id: 'data', label: 'Your data', icon: <HardDrive size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
]

export default function SettingsModal({ open, onClose, settings, onChange, models, status, systemInfo, onRefreshModels, onChatsChanged }) {
  const toast = useToast()
  const [section, setSection] = useState('general')
  const [stats, setStats] = useState(null)
  const [hostDraft, setHostDraft] = useState(settings.ollamaHost)

  useEffect(() => {
    if (!open) return
    setHostDraft(settings.ollamaHost)
    window.api.store.stats().then(setStats).catch(() => {})
  }, [open, settings.ollamaHost])

  const set = (patch) => onChange(patch)

  const applyHost = async () => {
    try {
      await window.api.ollama.setHost(hostDraft)
      set({ ollamaHost: hostDraft })
      await onRefreshModels()
      toast('Server address updated.', 'success')
    } catch (err) {
      toast(`Couldn't reach that address: ${err.message}`, 'error')
    }
  }

  const exportChats = async () => {
    try {
      const result = await window.api.files.exportChats()
      if (!result.canceled) toast(`Exported ${result.chats} chats.`, 'success')
    } catch (err) {
      toast(`Export failed: ${err.message}`, 'error')
    }
  }

  const importChats = async () => {
    try {
      const result = await window.api.files.importChats()
      if (!result.canceled) {
        toast(`Imported ${result.imported} chats.`, 'success')
        await onChatsChanged()
        setStats(await window.api.store.stats())
      }
    } catch (err) {
      toast(`Import failed: ${err.message}`, 'error')
    }
  }

  const deleteAll = async () => {
    const { confirmed } = await window.api.app.confirm({
      title: 'Delete all chats',
      message: 'Delete every saved chat?',
      detail: 'This permanently removes all conversations stored on this computer. It cannot be undone.',
      confirmLabel: 'Delete all',
    })
    if (!confirmed) return

    await window.api.store.deleteAllChats()
    await onChatsChanged()
    setStats(await window.api.store.stats())
    toast('All chats deleted.', 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="wide">
      <div className="settings-layout">
        <div className="settings-nav">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              className={classNames(section === item.id && 'active')}
              onClick={() => setSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {section === 'general' && (
            <>
              <div className="field">
                <div className="field-head">
                  <span className="field-label">Appearance</span>
                  <Segmented
                    value={settings.theme}
                    onChange={(theme) => set({ theme })}
                    options={[
                      { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
                      { value: 'light', label: 'Light', icon: <Sun size={14} /> },
                      { value: 'system', label: 'System' },
                    ]}
                  />
                </div>
              </div>

              <div className="field">
                <div className="field-head">
                  <span className="field-label">Message text size</span>
                  <Segmented
                    value={settings.fontSize}
                    onChange={(fontSize) => set({ fontSize })}
                    options={[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ]}
                  />
                </div>
              </div>

              <SwitchRow
                label="Send with Enter"
                hint="When off, Enter adds a new line and ⌘/Ctrl + Enter sends."
                checked={settings.sendOnEnter}
                onChange={(sendOnEnter) => set({ sendOnEnter })}
              />
              <SwitchRow
                label="Name chats automatically"
                hint="Uses the model to write a short title after your first message."
                checked={settings.autoTitle}
                onChange={(autoTitle) => set({ autoTitle })}
              />
              <SwitchRow
                label="Show response stats"
                hint="Displays tokens per second and generation time under each reply."
                checked={settings.showTokenStats}
                onChange={(showTokenStats) => set({ showTokenStats })}
              />
            </>
          )}

          {section === 'model' && (
            <>
              <Field label="Default model" hint="New chats start with this model.">
                <select
                  className="select-input"
                  value={settings.defaultModel}
                  onChange={(e) => set({ defaultModel: e.target.value })}
                >
                  <option value="">Most recently used</option>
                  {models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="System prompt"
                hint="Sent at the start of every conversation to set the model's behaviour. Leave empty for none."
              >
                <textarea
                  className="text-input"
                  value={settings.systemPrompt}
                  placeholder="You are a helpful assistant."
                  onChange={(e) => set({ systemPrompt: e.target.value })}
                />
              </Field>

              <Slider
                label="Temperature"
                hint="Lower is focused and predictable, higher is more creative."
                value={settings.temperature}
                min={0}
                max={2}
                step={0.05}
                onChange={(temperature) => set({ temperature })}
                format={(v) => v.toFixed(2)}
              />

              <Slider
                label="Top P"
                hint="Limits sampling to the most likely tokens by cumulative probability."
                value={settings.topP}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(topP) => set({ topP })}
                format={(v) => v.toFixed(2)}
              />

              <Slider
                label="Top K"
                hint="Caps how many candidate tokens are considered at each step."
                value={settings.topK}
                min={1}
                max={100}
                step={1}
                onChange={(topK) => set({ topK })}
              />

              <Slider
                label="Repeat penalty"
                hint="Higher values discourage the model from repeating itself."
                value={settings.repeatPenalty}
                min={1}
                max={2}
                step={0.05}
                onChange={(repeatPenalty) => set({ repeatPenalty })}
                format={(v) => v.toFixed(2)}
              />

              <Slider
                label="Context window"
                hint="How much conversation the model can see. Larger uses more memory."
                value={settings.numCtx}
                min={1024}
                max={32768}
                step={1024}
                onChange={(numCtx) => set({ numCtx })}
                format={(v) => `${v.toLocaleString()} tokens`}
              />

              <Slider
                label="Max response length"
                hint="Set to unlimited to let the model decide when to stop."
                value={settings.numPredict}
                min={-1}
                max={8192}
                step={128}
                onChange={(numPredict) => set({ numPredict })}
                format={(v) => (v <= 0 ? 'Unlimited' : `${v.toLocaleString()} tokens`)}
              />
            </>
          )}

          {section === 'server' && (
            <>
              <Field
                label="Ollama server address"
                hint="Point this elsewhere to use a model server running on another machine on your network."
              >
                <div className="row">
                  <input
                    className="text-input mono"
                    value={hostDraft}
                    onChange={(e) => setHostDraft(e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                  />
                  <button className="btn" onClick={applyHost} disabled={hostDraft === settings.ollamaHost}>
                    Apply
                  </button>
                </div>
              </Field>

              <Field label="Keep model in memory" hint="How long a model stays loaded after its last use.">
                <select
                  className="select-input"
                  value={settings.keepAlive}
                  onChange={(e) => set({ keepAlive: e.target.value })}
                >
                  <option value="0">Unload immediately</option>
                  <option value="5m">5 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="-1">Keep loaded indefinitely</option>
                </select>
              </Field>

              <SwitchRow
                label="Start the server automatically"
                hint="Launches Ollama in the background when this app opens."
                checked={settings.autoStartServer}
                onChange={(autoStartServer) => set({ autoStartServer })}
              />

              <div className="detail-section" style={{ marginTop: 22 }}>
                <h4>Connection</h4>
                <dl className="info-grid">
                  <dt>Status</dt>
                  <dd>{status?.running ? 'Connected' : 'Not running'}</dd>
                  <dt>Version</dt>
                  <dd>{status?.version || '—'}</dd>
                  <dt>Binary</dt>
                  <dd className="mono" style={{ fontSize: 12 }}>{status?.binary || 'not found'}</dd>
                </dl>
              </div>
            </>
          )}

          {section === 'data' && (
            <>
              <div className="detail-section">
                <h4>Stored on this computer</h4>
                <dl className="info-grid">
                  <dt>Chats</dt>
                  <dd>{stats?.chats ?? '—'}</dd>
                  <dt>Messages</dt>
                  <dd>{stats?.messages ?? '—'}</dd>
                  <dt>Size on disk</dt>
                  <dd>{stats ? formatBytes(stats.bytes) : '—'}</dd>
                  <dt>Location</dt>
                  <dd className="mono" style={{ fontSize: 11.5 }}>{stats?.location || '—'}</dd>
                </dl>
              </div>

              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                <button className="btn" onClick={exportChats}>
                  <Download size={15} />
                  Export all chats
                </button>
                <button className="btn" onClick={importChats}>
                  Import from file
                </button>
                {stats?.location && (
                  <button className="btn ghost" onClick={() => window.api.app.showItem(stats.location)}>
                    <Folder size={15} />
                    Show folder
                  </button>
                )}
              </div>

              <div className="field-hint" style={{ marginTop: 20, lineHeight: 1.65 }}>
                Nothing you type here is sent anywhere. Conversations are plain JSON files in the folder above, and
                model responses are generated entirely on this machine.
              </div>

              <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                <button className="btn danger" onClick={deleteAll}>
                  <Trash size={15} />
                  Delete all chats
                </button>
              </div>
            </>
          )}

          {section === 'about' && (
            <>
              <div className="detail-section">
                <h4>Local Graph</h4>
                <dl className="info-grid">
                  <dt>App version</dt>
                  <dd>{systemInfo?.version || '—'}</dd>
                  <dt>Ollama</dt>
                  <dd>{status?.version ? `v${status.version}` : 'not detected'}</dd>
                  <dt>Electron</dt>
                  <dd>{systemInfo?.electron || '—'}</dd>
                  <dt>Node</dt>
                  <dd>{systemInfo?.node || '—'}</dd>
                  <dt>Platform</dt>
                  <dd>{systemInfo ? `${systemInfo.platform} ${systemInfo.arch}` : '—'}</dd>
                  <dt>Memory</dt>
                  <dd>{systemInfo?.totalMemoryGB ? `${systemInfo.totalMemoryGB} GB` : '—'}</dd>
                  <dt>CPU cores</dt>
                  <dd>{systemInfo?.cpus ?? '—'}</dd>
                </dl>
              </div>

              <div className="field-hint" style={{ lineHeight: 1.7 }}>
                Models are served by{' '}
                <button
                  style={{ textDecoration: 'underline', color: 'var(--accent)' }}
                  onClick={() => window.api.app.openExternal('https://ollama.com')}
                >
                  Ollama
                </button>
                , running locally. No account, no cloud, no telemetry.
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
