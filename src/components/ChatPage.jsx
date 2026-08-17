import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Composer from './Composer.jsx'
import Message from './Message.jsx'
import ModelPicker from './ModelPicker.jsx'
import { uid, useToast, Spinner } from './ui.jsx'
import { ChevronDown, X, Boxes, Warning } from '../lib/icons.jsx'
import { ICONS_BY_NAME, Sparkle } from '../lib/icons.jsx'
import { STARTERS } from '../lib/catalog.js'
import logoUrl from '../../assets/icon-512.png'
import { isVisionModel, isEmbeddingModel, titleFromText, classNames } from '../lib/format.js'

const FLUSH_INTERVAL_MS = 60

export default function ChatPage({
  chat,
  models,
  loadedNames,
  settings,
  selectedModel,
  onSelectModel,
  onChatChanged,
  onCreateChat,
  onRoute,
  onOpenSetup,
  serverRunning,
  sidebarCollapsed,
}) {
  const toast = useToast()

  const [messages, setMessages] = useState(chat?.messages || [])
  // The draft lives in the Composer; here it's only mirrored into a ref so
  // sending can read it without a re-render per keystroke.
  const inputRef = useRef('')
  const composerRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const [streaming, setStreaming] = useState(null) // { requestId, messageId }
  const [streamText, setStreamText] = useState({ content: '', thinking: '' })
  const [lightbox, setLightbox] = useState(null)
  const [atBottom, setAtBottom] = useState(true)
  const [visionBlock, setVisionBlock] = useState(null)

  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const streamBuffer = useRef({ content: '', thinking: '', dirty: false })
  const chatRef = useRef(chat)
  const messagesRef = useRef(messages)
  const selfCreatedId = useRef(null)

  chatRef.current = chat
  messagesRef.current = messages

  const activeModel = models.find((m) => m.name === selectedModel)
  const supportsVision = isVisionModel(activeModel)

  // Swap the visible transcript when the selected chat changes. The one exception
  // is the chat this component just created for an in-flight first message —
  // resetting there would throw away the message the user is currently sending.
  useEffect(() => {
    if (chat?.id && chat.id === selfCreatedId.current) {
      selfCreatedId.current = null
      return
    }
    setMessages(chat?.messages || [])
    inputRef.current = ''
    composerRef.current?.clear()
    setAttachments([])
    setStreaming(null)
    setStreamText({ content: '', thinking: '' })
    streamBuffer.current = { content: '', thinking: '', dirty: false }
  }, [chat?.id])

  // Flush the streaming buffer on a timer instead of per-token, so markdown
  // re-parsing doesn't fight with a fast model.
  useEffect(() => {
    const timer = setInterval(() => {
      const buffer = streamBuffer.current
      if (!buffer.dirty) return
      buffer.dirty = false
      setStreamText({ content: buffer.content, thinking: buffer.thinking })
    }, FLUSH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // ------------------------------------------------------------- scrolling

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distance < 120)
  }, [])

  useEffect(() => {
    if (atBottom) scrollToBottom(streaming ? 'auto' : 'smooth')
  }, [messages.length, streamText.content, atBottom, streaming, scrollToBottom])

  // -------------------------------------------------------------- persist

  /**
   * Writes to a specific chat by id rather than "whatever is on screen", so a
   * generation that finishes after the user has navigated away still lands in
   * the conversation it belongs to.
   */
  const persistTo = useCallback(
    async (chatId, nextMessages, extra = {}) => {
      if (!chatId) return null
      const base = chatRef.current?.id === chatId ? chatRef.current : await window.api.store.getChat(chatId)
      if (!base) return null
      const saved = await window.api.store.saveChat({ ...base, ...extra, messages: nextMessages })
      onChatChanged(saved)
      return saved
    },
    [onChatChanged],
  )

  // ---------------------------------------------------------- api payload

  const buildRequestMessages = useCallback(
    (history, targetModel) => {
      const payload = []
      const systemPrompt = (chatRef.current?.systemPrompt || settings.systemPrompt || '').trim()
      if (systemPrompt) payload.push({ role: 'system', content: systemPrompt })

      // Images only ever go to a model that can see them; a text-only model never
      // receives them, and never receives a stand-in for them either.
      const canSee = isVisionModel(models.find((m) => m.name === targetModel))

      for (const message of history) {
        if (message.error) continue // never feed a failed turn back to the model

        let content = message.content || ''
        for (const file of message.files || []) {
          content += `\n\n--- ${file.name} ---\n${file.text}`
        }

        const entry = { role: message.role, content }
        if (canSee) {
          const images = (message.images || []).map((image) => image.base64).filter(Boolean)
          if (images.length) entry.images = images
        }
        payload.push(entry)
      }

      return payload
    },
    [settings.systemPrompt, models],
  )

  const generationOptions = useMemo(
    () => ({
      temperature: settings.temperature,
      top_p: settings.topP,
      top_k: settings.topK,
      repeat_penalty: settings.repeatPenalty,
      num_ctx: settings.numCtx,
      ...(settings.numPredict > 0 ? { num_predict: settings.numPredict } : {}),
    }),
    [settings.temperature, settings.topP, settings.topK, settings.repeatPenalty, settings.numCtx, settings.numPredict],
  )

  // ------------------------------------------------------------ streaming

  const runGeneration = useCallback(
    async (targetChatId, history, assistant, model) => {
      const assistantId = assistant.id
      const requestId = uid()
      streamBuffer.current = { content: '', thinking: '', dirty: false }
      setStreamText({ content: '', thinking: '' })
      setStreaming({ requestId, messageId: assistantId })

      // Timing/token counts arrive on the final event, not the HTTP response.
      let doneStats = null

      const unsubscribe = window.api.ollama.onChatEvent((event) => {
        if (event.requestId !== requestId) return
        if (event.type === 'delta') {
          const buffer = streamBuffer.current
          if (event.delta) buffer.content += event.delta
          if (event.thinking) buffer.thinking += event.thinking
          buffer.dirty = true
        }
        if (event.type === 'done') doneStats = event.stats
      })

      let result
      try {
        result = await window.api.ollama.chat({
          requestId,
          model,
          messages: buildRequestMessages(history, model),
          options: generationOptions,
          keepAlive: settings.keepAlive,
        })
      } catch (err) {
        result = { ok: false, error: err.message }
      } finally {
        unsubscribe()
      }

      const buffer = streamBuffer.current

      // Build the final transcript from what we started with, not from live state —
      // the user may have switched chats while this was streaming.
      const finished = [
        ...history,
        {
          ...assistant,
          content: buffer.content,
          thinking: buffer.thinking || undefined,
          pending: false,
          stats: doneStats,
          error: result?.ok === false && !result?.aborted ? result.error : undefined,
          aborted: result?.aborted || undefined,
        },
      ]

      const stillViewing = chatRef.current?.id === targetChatId
      if (stillViewing) {
        setMessages(finished)
        setStreaming(null)
        setStreamText({ content: '', thinking: '' })
      }
      streamBuffer.current = { content: '', thinking: '', dirty: false }

      await persistTo(targetChatId, finished)

      if (result?.ok === false && !result?.aborted) {
        toast(result.error || 'Generation failed.', 'error', 7000)
      }

      return finished
    },
    [buildRequestMessages, generationOptions, persistTo, settings.keepAlive, toast],
  )

  /** Ask the model for a short title once the first exchange lands. */
  const maybeAutoTitle = useCallback(
    async (chatId, finalMessages, model) => {
      if (!settings.autoTitle || !chatId) return
      const current = await window.api.store.getChat(chatId)
      if (!current || current.title !== 'New chat') return

      const firstUser = finalMessages.find((m) => m.role === 'user')
      if (!firstUser) return

      // Use the first message as an immediate title, then refine with the model.
      const fallback = titleFromText(firstUser.content)
      const saved = await window.api.store.patchChat(chatId, { title: fallback })
      if (saved) {
        if (chatRef.current?.id === chatId) chatRef.current = { ...chatRef.current, title: fallback }
        onChatChanged(saved)
      }

      try {
        const raw = await window.api.ollama.generate({
          model,
          system:
            'You write short chat titles. Reply with 3 to 6 words only. No quotes, no punctuation at the end, no preamble.',
          prompt: `Write a short title for a conversation that starts with:\n\n${String(firstUser.content).slice(0, 500)}`,
          options: { temperature: 0.2, num_predict: 24 },
        })

        const title = String(raw)
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/["'`]/g, '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)[0]

        if (title && title.length <= 60) {
          const updated = await window.api.store.patchChat(chatId, { title })
          if (updated) {
            if (chatRef.current?.id === chatId) chatRef.current = { ...chatRef.current, title }
            onChatChanged(updated)
          }
        }
      } catch {
        // Keeping the fallback title is fine — no need to bother the user.
      }
    },
    [settings.autoTitle, onChatChanged],
  )

  // --------------------------------------------------------------- actions

  const send = useCallback(
    async ({ overrideText, dropImages = false, modelOverride } = {}) => {
      const text = (overrideText ?? inputRef.current).trim()
      const model = modelOverride || selectedModel
      if (!text && attachments.length === 0) return

      if (!model) {
        toast('Pick a model first — you can download one from the Models page.', 'error')
        return
      }

      const allImages = attachments.filter((a) => a.kind === 'image')
      const files = attachments.filter((a) => a.kind === 'file')

      // Images are only ever read by a model that can see them. Sending them to a
      // text-only model fails server-side, so stop here and offer the ways out.
      const modelSupportsVision = isVisionModel(models.find((m) => m.name === model))
      if (allImages.length && !modelSupportsVision && !dropImages) {
        setVisionBlock({ model, count: allImages.length })
        return
      }

      const images = dropImages ? [] : allImages
      setVisionBlock(null)

      // Lazily create the chat record on the first message.
      let current = chatRef.current
      if (!current) {
        current = await onCreateChat({ model })
        selfCreatedId.current = current.id
        chatRef.current = current
      }

      const userMessage = {
        id: uid(),
        role: 'user',
        content: text,
        images: images.map((image) => ({
          name: image.name,
          mime: image.mime,
          dataUrl: image.dataUrl,
          base64: image.base64,        })),
        files: files.map((file) => ({ name: file.name, size: file.size, text: file.text })),
        createdAt: new Date().toISOString(),
      }

      const assistantMessage = {
        id: uid(),
        role: 'assistant',
        content: '',
        model,
        pending: true,
        createdAt: new Date().toISOString(),
      }

      const history = [...messagesRef.current, userMessage]
      const withPlaceholder = [...history, assistantMessage]

      setMessages(withPlaceholder)
      inputRef.current = ''
      composerRef.current?.clear()
      setAttachments([])
      setAtBottom(true)
      await persistTo(current.id, withPlaceholder, { model })

      const finished = await runGeneration(current.id, history, assistantMessage, model)
      await maybeAutoTitle(current.id, finished, model)
    },
    [
      attachments, selectedModel, models, onCreateChat,
      persistTo, runGeneration, maybeAutoTitle, toast,
    ],
  )

  const stop = useCallback(() => {
    if (streaming?.requestId) window.api.ollama.abort(streaming.requestId)
  }, [streaming])

  const regenerate = useCallback(
    async (assistantId) => {
      const chatId = chatRef.current?.id
      const index = messagesRef.current.findIndex((m) => m.id === assistantId)
      if (index < 0 || !selectedModel || !chatId) return

      const history = messagesRef.current.slice(0, index)
      const replacement = {
        id: uid(),
        role: 'assistant',
        content: '',
        model: selectedModel,
        pending: true,
        createdAt: new Date().toISOString(),
      }

      setMessages([...history, replacement])
      setAtBottom(true)
      await runGeneration(chatId, history, replacement, selectedModel)
    },
    [runGeneration, selectedModel],
  )

  /** Editing a user message rewinds the conversation to that point. */
  const editMessage = useCallback(
    async (messageId, text) => {
      const chatId = chatRef.current?.id
      const index = messagesRef.current.findIndex((m) => m.id === messageId)
      if (index < 0 || !selectedModel || !chatId) return

      const edited = { ...messagesRef.current[index], content: text }
      const history = [...messagesRef.current.slice(0, index), edited]
      const replacement = {
        id: uid(),
        role: 'assistant',
        content: '',
        model: selectedModel,
        pending: true,
        createdAt: new Date().toISOString(),
      }

      setMessages([...history, replacement])
      setAtBottom(true)
      await persistTo(chatId, [...history, replacement])
      await runGeneration(chatId, history, replacement, selectedModel)
    },
    [persistTo, runGeneration, selectedModel],
  )

  const deleteMessage = useCallback(
    async (messageId) => {
      const chatId = chatRef.current?.id
      const next = messagesRef.current.filter((m) => m.id !== messageId)
      setMessages(next)
      await persistTo(chatId, next)
    },
    [persistTo],
  )

  const addAttachments = useCallback((incoming) => {
    setAttachments((prev) => {
      const seen = new Set(prev.map((a) => a.id))
      return [...prev, ...incoming.filter((a) => !seen.has(a.id))]
    })
  }, [])

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // ----------------------------------------------------------- rendering

  const rendered = useMemo(() => {
    if (!streaming) return messages
    return messages.map((message) =>
      message.id === streaming.messageId
        ? { ...message, content: streamText.content, thinking: streamText.thinking }
        : message,
    )
  }, [messages, streaming, streamText])

  const serverDown = !serverRunning
  const noModels = models.length === 0
  const blocked = serverDown || noModels
  const isEmpty = rendered.length === 0

  // An installed model that could actually handle the attached images.
  const visionAlternative = models.find((m) => isVisionModel(m) && !isEmbeddingModel(m))

  const visionNotice = visionBlock && (
    <div className="vision-notice">
      <Warning size={16} />
      <div className="vn-body">
        <div className="vn-title">{visionBlock.model} can't read images</div>
        <div className="vn-text">
          {visionAlternative
            ? `${visionAlternative.name} is installed and can. Switch to it, or send your message without the ${visionBlock.count === 1 ? 'image' : 'images'}.`
            : `Only a vision model can read ${visionBlock.count === 1 ? 'an image' : 'images'}. Download one — moondream is about 1.7 GB, llava about 4.7 GB — or send without ${visionBlock.count === 1 ? 'it' : 'them'}.`}
        </div>
        <div className="vn-actions">
          {visionAlternative ? (
            <button
              className="btn sm accent"
              onClick={() => {
                onSelectModel(visionAlternative.name)
                send({ modelOverride: visionAlternative.name })
              }}
            >
              Switch to {visionAlternative.name}
            </button>
          ) : (
            <button className="btn sm accent" onClick={() => onRoute('models', 'vision')}>
              Get a vision model
            </button>
          )}
          <button className="btn sm" onClick={() => send({ dropImages: true })}>
            Send without images
          </button>
          <button className="btn sm ghost" onClick={() => setVisionBlock(null)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const composer = (
    <Composer
      ref={composerRef}
      onTextChange={(text) => {
        inputRef.current = text
      }}
      onSend={() => send()}
      onStop={stop}
      streaming={Boolean(streaming)}
      attachments={attachments}
      onAddAttachments={addAttachments}
      onRemoveAttachment={removeAttachment}
      disabled={blocked}
      supportsVision={supportsVision}
      sendOnEnter={settings.sendOnEnter}
      autoFocus={isEmpty}
      placeholder={
        serverDown
          ? 'Start the model server to begin…'
          : noModels
            ? 'Download a model to start chatting…'
            : `Message ${selectedModel || 'your local model'}…`
      }
    />
  )

  return (
    <>
      <div className={classNames('topbar', sidebarCollapsed && 'shifted')}>
        <ModelPicker
          models={models}
          value={selectedModel}
          onChange={onSelectModel}
          loadedNames={loadedNames}
          onManageModels={() => onRoute('models')}
          disabled={Boolean(streaming)}
        />
        <div className="topbar-spacer" />
        {chat?.title && chat.title !== 'New chat' && (
          <span className="muted truncate" style={{ fontSize: 13, maxWidth: 280 }}>
            {chat.title}
          </span>
        )}
      </div>

      {serverDown ? (
        <div className="banner">
          <Warning size={16} />
          <span className="banner-spacer">The local model server isn't running.</span>
          <button onClick={onOpenSetup}>Set it up</button>
        </div>
      ) : noModels ? (
        <div className="banner">
          <Warning size={16} />
          <span className="banner-spacer">No models installed yet.</span>
          <button onClick={() => onRoute('models')}>Browse models</button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="welcome">
          <img className="welcome-logo" src={logoUrl} alt="" />
          <h1 className="welcome-title">What can I help with?</h1>
          <p className="welcome-sub">
            {serverDown
              ? 'Set up the local engine to get started.'
              : noModels
                ? 'Download a model to get started.'
                : 'Running privately on this computer.'}
          </p>
          <div className="welcome-composer">
            {visionNotice}            {composer}
          </div>
          <div className="starters">
            {STARTERS.map((starter) => {
              const Icon = ICONS_BY_NAME[starter.icon] || Sparkle
              return (
                <button
                  key={starter.label}
                  className="starter-chip"
                  onClick={() => composerRef.current?.setText(starter.prompt)}
                  disabled={blocked}
                >
                  <Icon size={15} />
                  {starter.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>
            <div className="messages">
              {rendered.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  streaming={streaming?.messageId === message.id}
                  showStats={settings.showTokenStats}
                  onRegenerate={regenerate}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onOpenImage={setLightbox}
                  isLast={index === rendered.length - 1}
                />
              ))}
              <div ref={bottomRef} style={{ height: 1 }} />
            </div>
          </div>

          {!atBottom && (
            <button className="scroll-bottom-btn" onClick={() => scrollToBottom()} aria-label="Scroll to bottom">
              <ChevronDown size={18} />
            </button>
          )}

          <div className="composer-dock">
            {visionNotice}            {composer}
            <div className="composer-hint">
              Responses come from a model running on this computer. Chats are stored locally.
            </div>
          </div>
        </>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" aria-label="Close">
            <X size={19} />
          </button>
          <img src={lightbox} alt="Attachment" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

export { Boxes }
