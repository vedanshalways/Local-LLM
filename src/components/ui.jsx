import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react'
import { X, Check, Warning, Info, ChevronDown } from '../lib/icons.jsx'
import { classNames } from '../lib/format.js'

/** Not every runtime exposes crypto.randomUUID, so keep a local fallback. */
export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ----------------------------------------------------------------- toasts

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, kind = 'info', ttl = 4000) => {
    const id = uid()
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttl)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={classNames('toast', toast.kind)}>
            {toast.kind === 'success' ? <Check size={16} /> : toast.kind === 'error' ? <Warning size={16} /> : <Info size={16} />}
            <span className="toast-text">{toast.message}</span>
            <button
              className="icon-btn"
              style={{ width: 24, height: 24 }}
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

// ------------------------------------------------------------------ modal

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={classNames('modal', size)} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        )}
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// --------------------------------------------------------------- dropdown

/** Click-outside + Escape aware popover anchored to a trigger. */
export function useDismiss(onDismiss) {
  const ref = useRef(null)

  useEffect(() => {
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [onDismiss])

  return ref
}

// --------------------------------------------------------------- controls

export function Switch({ checked, onChange, label }) {
  return (
    <button
      className={classNames('switch', checked && 'on')}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}

export function SwitchRow({ label, hint, checked, onChange }) {
  return (
    <div className="switch-row">
      <div className="sr-body">
        <div className="sr-label">{label}</div>
        {hint && <div className="sr-hint">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          className={classNames(value === option.value && 'active')}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({ label, hint, value, min, max, step, onChange, format }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{label}</span>
        <span className="field-value">{format ? format(value) : value}</span>
      </div>
      <input
        className="range-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{label}</span>
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

export function Spinner({ accent = false }) {
  return <span className={classNames('spinner', accent && 'accent')} />
}

export function ProgressBar({ value, indeterminate = false }) {
  return (
    <div className="progress-track">
      <div
        className={classNames('progress-fill', indeterminate && 'indeterminate')}
        style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
      />
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

/** Copy-to-clipboard button that briefly confirms. */
export function CopyButton({ text, className = 'action-btn', label = 'Copy', showLabel = false, size = 15 }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button className={className} onClick={copy} title={label} aria-label={label}>
      {copied ? <Check size={size} /> : <CopyGlyph size={size} />}
      {showLabel && <span>{copied ? 'Copied' : label}</span>}
    </button>
  )
}

function CopyGlyph({ size }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function Collapse({ open, children }) {
  if (!open) return null
  return children
}

export { ChevronDown }
