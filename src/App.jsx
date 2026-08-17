import { useCallback, useEffect, useState, useRef } from 'react'

import Sidebar from './components/Sidebar.jsx'
import ChatPage from './components/ChatPage.jsx'
import ModelsPage from './components/ModelsPage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import SearchModal from './components/SearchModal.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import TitleBar from './components/TitleBar.jsx'
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
  const activeChatRef = useRef(activeChat)
  activeChatRef.current = activeChat

  const [route, setRoute] = useState('chat')
  const [modelFilter, setModelFilter] = useState('all')

  // Browser-style tabs. A tab is either a chat (saved, or a not-yet-created
  // draft) or the Models page; the active one drives `route` and `activeChat`.
  const [tabs, setTabs] = useState([{ id: 'tab-0', kind: 'chat', chatId: null, title: 'New chat' }])
  const [activeTabId, setActiveTabId] = useState('tab-0')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)

  const selectedModelRef = useRef(selectedModel)
  selectedModelRef.current = selectedModel

  // Refs so the tab callbacks can read current state without being rebuilt on
  // every switch (they're passed down to memoised children).
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs
  const activeTabIdRef = useRef(activeTabId)
  activeTabIdRef.current = activeTabId
  const tabSeq = useRef(1)

  const patchActiveTab = useCallback((patch) => {
    setTabs((prev) => prev.map((tab) => (tab.id === activeTabIdRef.current ? { ...tab, ...patch } : tab)))
  }, [])

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
    // Keep the native caption buttons in step with the strip they sit in.
    window.api.app.setTitleBarTheme?.(theme)
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

  const openChat = useCallback(
    async (id) => {
      const chat = await window.api.store.getChat(id)
      if (!chat) return
      setActiveChat(chat)
      setRoute('chat')
      if (chat.model) setSelectedModel(chat.model)
      patchActiveTab({ kind: 'chat', chatId: chat.id, title: chat.title || 'New chat' })
    },
    [patchActiveTab],
  )

  /** Blank the current tab back to a draft — the sidebar's "New chat". */
  const newChat = useCallback(() => {
    setActiveChat(null)
    setRoute('chat')
    patchActiveTab({ kind: 'chat', chatId: null, title: 'New chat' })
  }, [patchActiveTab])

  const newTab = useCallback(() => {
    const id = `tab-${tabSeq.current++}`
    setTabs((prev) => [...prev, { id, kind: 'chat', chatId: null, title: 'New chat' }])
    setActiveTabId(id)
    setActiveChat(null)
    setRoute('chat')
  }, [])

  const selectTab = useCallback(async (id) => {
    const tab = tabsRef.current.find((t) => t.id === id)
    if (!tab || id === activeTabIdRef.current) return

    setActiveTabId(id)
    activeTabIdRef.current = id

    if (tab.kind === 'models') {
      setRoute('models')
      return
    }

    setRoute('chat')
    if (!tab.chatId) {
      setActiveChat(null)
      return
    }

    const chat = await window.api.store.getChat(tab.chatId)
    if (chat) {
      setActiveChat(chat)
      if (chat.model) setSelectedModel(chat.model)
    } else {
      // Deleted from under us — fall back to a draft rather than an empty view.
      setActiveChat(null)
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, chatId: null, title: 'New chat' } : t)))
    }
  }, [])

  const closeTab = useCallback(
    (id) => {
      const current = tabsRef.current

      // The last tab is emptied rather than removed; a window with no tabs has
      // nothing to show and no way back.
      if (current.length === 1) {
        setTabs([{ ...current[0], kind: 'chat', chatId: null, title: 'New chat' }])
        setActiveChat(null)
        setRoute('chat')
        return
      }

      const index = current.findIndex((tab) => tab.id === id)
      const next = current.filter((tab) => tab.id !== id)
      setTabs(next)
      tabsRef.current = next

      if (id === activeTabIdRef.current) {
        selectTab(next[Math.min(index, next.length - 1)].id)
      }
    },
    [selectTab],
  )

  const createChat = useCallback(
    async (init) => {
      const chat = await window.api.store.createChat({
        model: init?.model || selectedModelRef.current,
        systemPrompt: '',
      })
      setActiveChat(chat)
      patchActiveTab({ kind: 'chat', chatId: chat.id, title: chat.title || 'New chat' })
      await refreshChats()
      return chat
    },
    [refreshChats, patchActiveTab],
  )

  const handleChatChanged = useCallback(
    (saved) => {
      setActiveChat((prev) => (prev && prev.id === saved.id ? { ...prev, ...saved } : prev))
      // Auto-titling happens after the first reply, so tabs follow it.
      setTabs((prev) =>
        prev.map((tab) => (tab.chatId === saved.id && saved.title ? { ...tab, title: saved.title } : tab)),
      )
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
      setTabs((prev) =>
        prev.map((tab) => (tab.chatId === id ? { ...tab, chatId: null, title: 'New chat' } : tab)),
      )
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

  /** Navigate the active tab, optionally pre-filtering the models page. */
  const goToRoute = useCallback(
    (next, filter) => {
      setRoute(next)
      if (filter) setModelFilter(filter)
      patchActiveTab(
        next === 'models'
          ? { kind: 'models', title: 'Models' }
          : { kind: 'chat', title: activeChatRef.current?.title || 'New chat' },
      )
    },
    [patchActiveTab],
  )

  const chatWithModel = useCallback(
    (name) => {
      setSelectedModel(name)
      setActiveChat(null)
      setRoute('chat')
      patchActiveTab({ kind: 'chat', chatId: null, title: 'New chat' })
    },
    [patchActiveTab],
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
      if (event.type === 'route') goToRoute(event.route)
    })
  }, [newChat, goToRoute])

  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()

      if (key === 'b') {
        event.preventDefault()
        setSidebarCollapsed((v) => !v)
      }
      if (key === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (key === 't') {
        event.preventDefault()
        newTab()
      }
      if (key === 'w') {
        event.preventDefault()
        closeTab(activeTabIdRef.current)
      }
      // Ctrl+Tab cycles, Ctrl+Shift+Tab goes back — as in a browser.
      if (event.key === 'Tab') {
        event.preventDefault()
        const list = tabsRef.current
        const index = list.findIndex((tab) => tab.id === activeTabIdRef.current)
        const step = event.shiftKey ? -1 : 1
        selectTab(list[(index + step + list.length) % list.length].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newTab, closeTab, selectTab])

  // Pick up newly downloaded models without a manual refresh.
  const refreshAfterModelChange = useCallback(async () => {
    const list = await refreshModels()
    if (list.length && !list.some((m) => m.name === selectedModelRef.current)) {
      setSelectedModel(list[0].name)
    }
    return list
  }, [refreshModels])

  // --------------------------------------------------------------- render

  // The strip carries the window controls, so it has to be up before the app is.
  if (!booted || !settings) {
    return (
      <div className="app-frame">
        <TitleBar
          tabs={[{ id: 'boot', title: 'Local Graph' }]}
          activeTabId="boot"
          onSelectTab={() => {}}
          onCloseTab={() => {}}
          onNewTab={() => {}}
        />
        <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Spinner accent />
        </div>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onNewTab={newTab}
      />

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
          onRoute={goToRoute}
          onRenameChat={renameChat}
          onDeleteChat={deleteChat}
          onTogglePin={togglePin}
        />

        <div className="main-pane">
          {sidebarCollapsed && (
            <div className="pane-float-actions">
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
              onModelsChanged={refreshAfterModelChange}
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
      </div>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up the local engine" size="wide">
        <SetupScreen
          status={status}
          onRecheck={async () => {
            // Re-checking has to reach a conclusion every time: connect, or start
            // the server we found, or say plainly what's still missing.
            let next = await refreshStatus()

            if (!next.running && next.installed) {
              const result = await window.api.ollama.start()
              next = await refreshStatus()
              if (!next.running) {
                return { ...next, error: result?.error || 'Ollama is installed but the server did not start.' }
              }
            }

            if (next.running) {
              const list = await refreshModels()
              if (list.length) setSelectedModel(list[0].name)
              setSetupOpen(false)
              toast(
                list.length
                  ? 'Connected to the local model server.'
                  : 'Connected — now download a model from the Models page.',
                'success',
              )
              if (!list.length) setRoute('models')
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
