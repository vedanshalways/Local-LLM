import { useEffect, useRef, useState } from 'react'
import { Search, X, PenSquare } from '../lib/icons.jsx'
import { formatRelative, classNames } from '../lib/format.js'

export default function SearchModal({ open, onClose, onOpenChat, onNewChat }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlighted(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Debounce so a fast typist doesn't hammer the file scan.
  useEffect(() => {
    if (!open) return undefined
    let canceled = false
    const timer = setTimeout(async () => {
      try {
        const hits = await window.api.store.searchChats(query)
        if (!canceled) {
          setResults(hits.slice(0, 60))
          setHighlighted(0)
        }
      } catch {
        if (!canceled) setResults([])
      }
    }, 120)

    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [query, open])

  if (!open) return null

  const onKeyDown = (event) => {
    if (event.key === 'Escape') return onClose()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((i) => Math.min(i + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    }
    if (event.key === 'Enter' && results[highlighted]) {
      onOpenChat(results[highlighted].id)
      onClose()
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Search chats">
        <div className="search-modal-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search your chats…"
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="search-results">
          <button
            className="search-result"
            onClick={() => {
              onNewChat()
              onClose()
            }}
          >
            <div className="sr-title row">
              <PenSquare size={15} />
              New chat
            </div>
          </button>

          {results.length === 0 && query && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13.5 }}>
              No chats match “{query}”.
            </div>
          )}

          {results.map((chat, index) => (
            <button
              key={chat.id}
              className={classNames('search-result', index === highlighted && 'highlighted')}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => {
                onOpenChat(chat.id)
                onClose()
              }}
            >
              <div className="sr-title">{chat.title}</div>
              {chat.preview && <div className="sr-preview">{chat.preview}</div>}
              <div className="sr-time">
                {formatRelative(chat.updatedAt)}
                {chat.model ? ` · ${chat.model}` : ''}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
