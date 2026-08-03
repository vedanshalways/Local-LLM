import { useState, useRef, useEffect, memo } from 'react'
import Markdown from './Markdown.jsx'
import { CopyButton } from './ui.jsx'
import { Refresh, Pencil, Trash, Brain, ChevronRight, File as FileIcon, Warning } from '../lib/icons.jsx'
import { classNames, formatBytes, tokensPerSecond, formatDuration } from '../lib/format.js'

function MessageInner({
  message,
  streaming,
  showStats,
  onRegenerate,
  onEdit,
  onDelete,
  onOpenImage,
  isLast,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const editRef = useRef(null)

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.focus()
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 320)}px`
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  const startEdit = () => {
    setDraft(message.content)
    setEditing(true)
  }

  const submitEdit = () => {
    const text = draft.trim()
    setEditing(false)
    if (text && text !== message.content) onEdit(message.id, text)
  }

  // ------------------------------------------------------------------ user

  if (message.role === 'user') {
    if (editing) {
      return (
        <div className="message user">
          <div className="edit-box">
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitEdit()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <div className="edit-box-actions">
              <button className="btn sm ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn sm primary" onClick={submitEdit}>
                Send
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="message user">
        <div style={{ maxWidth: '78%' }}>
          {(message.images?.length > 0 || message.files?.length > 0) && (
            <div className="message-attachments">
              {(message.images || []).map((image, index) => (
                <img
                  key={index}
                  className="attachment-thumb"
                  src={image.dataUrl}
                  alt={image.name || 'attachment'}
                  onClick={() => onOpenImage(image.dataUrl)}
                />
              ))}
              {(message.files || []).map((file, index) => (
                <div className="attachment-file" key={index}>
                  <FileIcon size={16} />
                  <div style={{ minWidth: 0 }}>
                    <div className="af-name">{file.name}</div>
                    <div className="af-meta">{formatBytes(file.size)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message.content && <div className="user-bubble">{message.content}</div>}

          <div className="message-actions">
            <CopyButton text={message.content} />
            <button className="action-btn" onClick={startEdit} title="Edit and resend">
              <Pencil size={15} />
            </button>
            <button className="action-btn danger" onClick={() => onDelete(message.id)} title="Delete message">
              <Trash size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------- assistant

  const stats = message.stats
  const tps = tokensPerSecond(stats)
  const empty = !message.content && !message.thinking && !message.error

  return (
    <div className="message assistant">
      <div className="assistant-body">
        {message.thinking && <ThinkingBlock text={message.thinking} streaming={streaming} />}

        {message.error ? (
          <div className="banner error" style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,.3)' }}>
            <Warning size={16} />
            <span className="banner-spacer">{message.error}</span>
          </div>
        ) : empty && streaming ? (
          <span className="typing-dot" />
        ) : (
          <>
            <Markdown>{message.content}</Markdown>
            {streaming && <span className="stream-cursor" />}
          </>
        )}
      </div>

      {!streaming && !empty && (
        <div className={classNames('message-actions', isLast && 'always')}>
          <CopyButton text={message.content} />
          <button className="action-btn" onClick={() => onRegenerate(message.id)} title="Regenerate response">
            <Refresh size={15} />
          </button>
          <button className="action-btn danger" onClick={() => onDelete(message.id)} title="Delete message">
            <Trash size={15} />
          </button>
          {showStats && stats && (
            <span className="message-stats">
              {message.model}
              {tps ? ` · ${tps.toFixed(1)} tok/s` : ''}
              {stats.evalCount ? ` · ${stats.evalCount} tokens` : ''}
              {stats.totalDuration ? ` · ${formatDuration(stats.totalDuration)}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ThinkingBlock({ text, streaming }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="thinking-block">
      <button className={classNames('thinking-header', open && 'open')} onClick={() => setOpen((v) => !v)}>
        <Brain size={15} />
        <span>{streaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronRight className="chev" size={15} />
      </button>
      {open && <div className="thinking-content">{text}</div>}
    </div>
  )
}

export default memo(MessageInner)
