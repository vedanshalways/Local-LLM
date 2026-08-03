import { useCallback, useEffect, useState, useRef } from 'react'

import Sidebar from './components/Sidebar.jsx'
import ChatPage from './components/ChatPage.jsx'
import ModelsPage from './components/ModelsPage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import SearchModal from './components/SearchModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { ToastProvider, Spinner, Modal, useToast } from './components/ui.jsx'
import { Sidebar as SidebarIcon, PenSquare } from './lib/icons.jsx'
import { classNames } from './lib/format.js'

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}

function Shell() {
  const toast = useToast()

  const [booted, setBooted] = useState(false)
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)

  const [models, setModels] = useState([])
  const [loaded, setLoaded] = useState([])
  const [selectedModel, setSelectedModel] = useState('')

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)

  const [route, setRoute] = useState('chat')
  const [modelFilter, setModelFilter] = useState('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)

  const selectedModelRef = useRef(selectedModel)
  selectedModelRef.current = selectedModel

  // ------------------------------------------------------------------ boot

  const refreshModels = useCallback(async () => {
    try {
      const list = await window.api.ollama.list()
      setModels(list)
      return list
    } catch {
      setModels([])
      return []
    }
  }, [])

  const refreshChats = useCallback(async () => {
    try {
      setChats(await window.api.store.listChats())
    } catch {
      setChats([])
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    const next = await window.api.ollama.status()
    setStatus(next)
    return next
  }, [])

  useEffect(() => {
    let canceled = false

    ;(async () => {
      const [loadedSettings, info] = await Promise.all([window.api.settings.get(), window.api.app.info()])
      if (canceled) return

      setSettings(loadedSettings)
      setSystemInfo(info)
      await refreshChats()

      // The main process may already be starting the server; poll briefly before
      // deciding to show the setup screen.
      let current = await refreshStatus()
      for (let attempt = 0; attempt < 8 && !current.running && current.installed; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        if (canceled) return
        current = await refreshStatus()
      }

      if (current.running) {
        const list = await refreshModels()
        if (!canceled && list.length) {
          const preferred = list.find((m) => m.name === loadedSettings.defaultModel)
          setSelectedModel(preferred?.name || list[0].name)
        }
      }

      if (!canceled) setBooted(true)
    })()

    return () => {
      canceled = true
    }
  }, [refreshChats, refreshModels, refreshStatus])

  // Reflect theme + text size on the root element.
  useEffect(() => {
    if (!settings) return
    const theme =
      settings.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : settings.theme
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.font = settings.fontSize
  }, [settings])

  // Keep the "loaded in memory" badges honest.
  useEffect(() => {
    if (!status?.running) return undefined
    let stop = false

    const tick = async () => {
      try {
        const running = await window.api.ollama.running()
        if (!stop) setLoaded(running)
      } catch {
        /* server may have gone away; the status poll will catch it */
      }
    }

    tick()
    const timer = setInterval(tick, 8000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [status?.running])

  // ---------------------------------------------------------------- chats

  const openChat = useCallback(async (id) => {
    const chat = await window.api.store.getChat(id)
    if (!chat) return
    setActiveChat(chat)
    setRoute('chat')
    if (chat.model) setSelectedModel(chat.model)
  }, [])

  const newChat = useCallback(() => {
    setActiveChat(null)
    setRoute('chat')
  }, [])

  const createChat = useCallback(
    async (init) => {
      const chat = await window.api.store.createChat({
        model: init?.model || selectedModelRef.current,
        systemPrompt: '',
      })
      setActiveChat(chat)
      await refreshChats()
      return chat
    },
    [refreshChats],
  )

  const handleChatChanged = useCallback(
    (saved) => {
      setActiveChat((prev) => (prev && prev.id === saved.id ? { ...prev, ...saved } : prev))
      refreshChats()
    },
    [refreshChats],
  )

  const deleteChat = useCallback(
    async (id) => {
      const { confirmed } = await window.api.app.confirm({
        title: 'Delete chat',
        message: 'Delete this chat?',
        detail: 'This removes the conversation from this computer permanently.',
      })
      if (!confirmed) return

      await window.api.store.deleteChat(id)
      setActiveChat((prev) => (prev?.id === id ? null : prev))
      await refreshChats()
    },
    [refreshChats],
  )

  const renameChat = useCallback(
    async (id, title) => {
      const saved = await window.api.store.patchChat(id, { title })
      if (saved) handleChatChanged(saved)
    },
    [handleChatChanged],
  )

  const togglePin = useCallback(
    async (id, pinned) => {
      const saved = await window.api.store.patchChat(id, { pinned })
      if (saved) handleChatChanged(saved)
    },
    [handleChatChanged],
  )

  // -------------------------------------------------------------- settings

  const updateSettings = useCallback(async (patch) => {
    const next = await window.api.settings.set(patch)
    setSettings(next)
    return next
  }, [])

  /** Navigate, optionally pre-filtering the models page (e.g. straight to vision). */
  const goToRoute = useCallback((next, filter) => {
    setRoute(next)
    if (filter) setModelFilter(filter)
  }, [])

  const chatWithModel = useCallback(
    (name) => {
      setSelectedModel(name)
      setActiveChat(null)
      setRoute('chat')
    },
    [],
  )

  const setDefaultModel = useCallback(
    async (name) => {
      await updateSettings({ defaultModel: name })
      toast(`${name} is now the default for new chats.`, 'success')
    },
    [updateSettings, toast],
  )

  // -------------------------------------------------------------- shortcuts

  useEffect(() => {
    return window.api.app.onMenu((event) => {
      if (event.type === 'new-chat') newChat()
      if (event.type === 'search') setSearchOpen(true)
      if (event.type === 'settings') setSettingsOpen(true)
      if (event.type === 'route') setRoute(event.route)
    })
  }, [newChat])

  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSidebarCollapsed((v) => !v)
      }
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Pick up newly downloaded models without a manual refresh.
  const refreshAfterModelChange = useCallback(async () => {
    const list = await refreshModels()
    if (list.length && !list.some((m) => m.name === selectedModelRef.current)) {
      setSelectedModel(list[0].name)
    }
    return list
  }, [refreshModels])

  // --------------------------------------------------------------- render

  if (!booted || !settings) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spinner accent />
      </div>
    )
  }

  return (
    <div className={classNames('app', sidebarCollapsed && 'sidebar-hidden')}>
      <Sidebar
        collapsed={sidebarCollapsed}
        chats={chats}
        activeChatId={activeChat?.id}
        route={route}
        modelCount={models.length}
        onToggle={() => setSidebarCollapsed(true)}
        onNewChat={newChat}
        onOpenChat={openChat}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onRoute={setRoute}
        onRenameChat={renameChat}
        onDeleteChat={deleteChat}
        onTogglePin={togglePin}
      />

      <div className="main-pane">
        {sidebarCollapsed && (
          <div
            style={{
              position: 'absolute',
              top: document.documentElement.classList.contains('mac') ? 18 : 11,
              left: document.documentElement.classList.contains('mac') ? 84 : 12,
              display: 'flex',
              gap: 4,
              zIndex: 30,
            }}
          >
            <button
              className="icon-btn"
              onClick={() => setSidebarCollapsed(false)}
              title="Open sidebar (⌘B)"
              aria-label="Open sidebar"
            >
              <SidebarIcon size={19} />
            </button>
            <button className="icon-btn" onClick={newChat} title="New chat (⌘N)" aria-label="New chat">
              <PenSquare size={19} />
            </button>
          </div>
        )}

        {route === 'chat' ? (
          <ChatPage
            chat={activeChat}
            models={models}
            loadedNames={loaded.map((m) => m.name)}
            settings={settings}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onChatChanged={handleChatChanged}
            onCreateChat={createChat}
            onRoute={goToRoute}
            onOpenSetup={() => setSetupOpen(true)}
            serverRunning={Boolean(status?.running)}
            sidebarCollapsed={sidebarCollapsed}
          />
        ) : (
          <ModelsPage
            models={models}
            loaded={loaded}
            systemInfo={systemInfo}
            defaultModel={settings.defaultModel}
            onSetDefaultModel={setDefaultModel}
            onRefresh={refreshAfterModelChange}
            onChatWithModel={chatWithModel}
            serverRunning={Boolean(status?.running)}
            onOpenSetup={() => setSetupOpen(true)}
            category={modelFilter}
            onCategoryChange={setModelFilter}
          />
        )}
      </div>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up the local engine" size="wide">
        <SetupScreen
          status={status}
          onRecheck={async () => {
            const next = await refreshStatus()
            if (next.running) {
              const list = await refreshModels()
              if (list.length) setSelectedModel(list[0].name)
              setSetupOpen(false)
              toast('Connected to the local model server.', 'success')
            }
            return next
          }}
          onStartServer={async () => {
            const result = await window.api.ollama.start()
            const next = await refreshStatus()
            if (next.running) {
              const list = await refreshModels()
              if (list.length) setSelectedModel(list[0].name)
              setSetupOpen(false)
              toast('Model server started.', 'success')
            }
            return result
          }}
        />
      </Modal>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        models={models}
        status={status}
        systemInfo={systemInfo}
        onRefreshModels={refreshAfterModelChange}
        onChatsChanged={refreshChats}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenChat={openChat}
        onNewChat={newChat}
      />
    </div>
  )
}
