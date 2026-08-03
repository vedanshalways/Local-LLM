import { useState, useCallback } from 'react'
import { ChevronDown, Check, Eye, Brain, Boxes, Plus } from '../lib/icons.jsx'
import { classNames, formatBytes, isVisionModel, isReasoningModel, isEmbeddingModel, prettyModelName } from '../lib/format.js'
import { useDismiss } from './ui.jsx'

export default function ModelPicker({ models, value, onChange, loadedNames = [], onManageModels, disabled }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(close)

  // Embedding models can't hold a conversation, so keep them out of the chat picker.
  const chatModels = models.filter((m) => !isEmbeddingModel(m))
  const selected = models.find((m) => m.name === value)

  return (
    <div className="model-picker" ref={ref}>
      <button
        className={classNames('model-picker-trigger', open && 'open')}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
      >
        <span>{selected ? prettyModelName(selected.name) : value || 'Select a model'}</span>
        <ChevronDown className="chev" size={16} />
      </button>

      {open && (
        <div className="dropdown">
          <div className="dropdown-label">Installed models</div>

          {chatModels.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              No models installed yet. Head to the Models page to download one.
            </div>
          )}

          {chatModels.map((model) => {
            const vision = isVisionModel(model)
            const reasoning = isReasoningModel(model)
            const loaded = loadedNames.includes(model.name)

            return (
              <button
                key={model.name}
                className="dropdown-item"
                onClick={() => {
                  onChange(model.name)
                  setOpen(false)
                }}
              >
                <div className="di-body">
                  <div className="di-title">
                    <span className="truncate">{model.name}</span>
                    {vision && <span className="badge vision"><Eye size={10} /> Vision</span>}
                    {reasoning && <span className="badge reasoning"><Brain size={10} /> Thinks</span>}
                    {loaded && <span className="badge loaded">Loaded</span>}
                  </div>
                  <div className="di-sub">
                    {[model.parameterSize, model.quantization, formatBytes(model.size)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {model.name === value && <Check className="di-check" size={16} />}
              </button>
            )
          })}

          <div className="dropdown-sep" />

          <button
            className="dropdown-item"
            onClick={() => {
              setOpen(false)
              onManageModels()
            }}
          >
            <Boxes size={16} />
            <div className="di-body">
              <div className="di-title">Manage models</div>
              <div className="di-sub">Browse, download and remove models</div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export { Plus }
