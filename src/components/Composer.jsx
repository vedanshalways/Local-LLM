import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Paperclip, ArrowUp, Stop, X, File as FileIcon, ImageIcon } from '../lib/icons.jsx'
import { classNames, formatBytes, stripDataUrl } from '../lib/format.js'
import { useDismiss } from './ui.jsx'

const MAX_TEXTAREA_HEIGHT = 220

// Chromium sizes the textarea to its content natively; where it does, the JS
// measurement below (which forces a layout on every keystroke) is skipped.
const NATIVE_AUTOSIZE =
  typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content')

/**
 * Owns the draft text itself rather than lifting it into ChatPage. Typing then
 * re-renders only this subtree instead of the whole conversation on every
 * keystroke; the parent reads the draft through `onTextChange` (into a ref) and
 * drives the box through the imperative handle.
 */
function ComposerInner({
  onTextChange,
  onSend,
  onStop,
  streaming,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  disabled,
  placeholder = 'Message your local model…',
  supportsVision,
  sendOnEnter = true,
  autoFocus = false,
}, ref) {
  const textareaRef = useRef(null)
  const [value, setValue] = useState('')
  const [dragging, setDragging] = useState(false)
  const [attachMenu, setAttachMenu] = useState(false)
  const attachRef = useDismiss(() => setAttachMenu(false))

  const resize = useCallback(() => {
    if (NATIVE_AUTOSIZE) return
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [])

  const apply = useCallback(
    (next) => {
      setValue(next)
      onTextChange?.(next)
    },
    [onTextChange],
  )

  useImperativeHandle(
    ref,
    () => ({
      clear: () => apply(''),
      setText: (text) => {
        apply(text)
        textareaRef.current?.focus()
      },
      focus: () => textareaRef.current?.focus(),
    }),
    [apply],
  )

  // Height only needs recomputing when the text actually changed.
  useEffect(resize, [value, resize])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const canSend = !disabled && !streaming && (value.trim().length > 0 || attachments.length > 0)

  const handleKeyDown = (event) => {
    const enter = event.key === 'Enter'
    if (!enter || event.isComposing) return

    const wantsSend = sendOnEnter ? !event.shiftKey : (event.metaKey || event.ctrlKey)
    if (wantsSend) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  /** Read dropped/pasted File objects into the same shape the main process returns. */
  const ingestFiles = async (fileList) => {
    const results = []
    for (const file of Array.from(fileList)) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readAsDataUrl(file)
        results.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          kind: 'image',
          name: file.name,
          size: file.size,
          mime: file.type,
          dataUrl,
          base64: stripDataUrl(dataUrl),
        })
      } else if (file.size <= 2 * 1024 * 1024) {
        const text = await file.text()
        results.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          kind: 'file',
          name: file.name,
          size: file.size,
          text,
        })
      }
    }
    if (results.length) onAddAttachments(results)
  }

  const handlePaste = (event) => {
    const items = Array.from(event.clipboardData?.items || [])
    const files = items.filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter(Boolean)
    if (files.length) {
      event.preventDefault()
      ingestFiles(files)
    }
  }

  const pickImages = async () => {
    setAttachMenu(false)
    const picked = await window.api.files.pickImages()
    if (picked.length) {
      onAddAttachments(
        picked.map((image) => ({ ...image, id: `${image.name}-${image.size}`, kind: 'image' })),
      )
    }
  }

  const pickDocuments = async () => {
    setAttachMenu(false)
    const picked = await window.api.files.pickDocuments()
    const usable = picked.filter((file) => !file.error)
    if (usable.length) {
      onAddAttachments(usable.map((file) => ({ ...file, id: `${file.name}-${file.size}`, kind: 'file' })))
    }
  }

  return (
    <div
      className={classNames('composer-glow', dragging && 'dragging')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer?.files?.length) ingestFiles(e.dataTransfer.files)
      }}
    >
      <div className="composer">
      {attachments.length > 0 && (
        <div className="composer-attachments">
          {attachments.map((attachment) => (
            <div className="chip-attachment" key={attachment.id}>
              {attachment.kind === 'image' ? (
                <img src={attachment.dataUrl} alt={attachment.name} />
              ) : (
                <div className="chip-icon">
                  <FileIcon size={17} />
                </div>
              )}
              <div className="chip-body">
                <div className="chip-name" title={attachment.name}>{attachment.name}</div>
                <div className="chip-meta">
                  {attachment.kind === 'image' ? 'Image' : 'Text'} · {formatBytes(attachment.size)}
                </div>
              </div>
              <button
                className="chip-remove"
                onClick={() => onRemoveAttachment(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-row">
        <div ref={attachRef} style={{ position: 'relative' }}>
          <button
            className="composer-btn"
            onClick={() => setAttachMenu((v) => !v)}
            disabled={disabled}
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip size={19} />
          </button>

          {attachMenu && (
            <div className="dropdown" style={{ bottom: 'calc(100% + 8px)', top: 'auto', minWidth: 250 }}>
              <button className="dropdown-item" onClick={pickImages}>
                <ImageIcon size={17} />
                <div className="di-body">
                  <div className="di-title">Upload images</div>
                  <div className="di-sub">
                    {supportsVision ? 'This model can read images' : 'Current model has no vision support'}
                  </div>
                </div>
              </button>
              <button className="dropdown-item" onClick={pickDocuments}>
                <FileIcon size={17} />
                <div className="di-body">
                  <div className="di-title">Upload text or code</div>
                  <div className="di-sub">Contents are added to your message</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => apply(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
        />

        {streaming ? (
          <button className="send-btn stop" onClick={onStop} title="Stop generating" aria-label="Stop generating">
            <Stop size={16} />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={onSend}
            disabled={!canSend}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUp size={19} />
          </button>
        )}
      </div>
      </div>
    </div>
  )
}

const Composer = forwardRef(ComposerInner)
export default Composer

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
