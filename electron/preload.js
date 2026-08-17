'use strict'

const { contextBridge, ipcRenderer } = require('electron')

/** Unwrap the {ok, data, error} envelope the main process returns. */
async function call(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args)
  if (!result || result.ok !== true) {
    throw new Error(result?.error || `IPC call failed: ${channel}`)
  }
  return result.data
}

/** Subscribe to a main-process event; returns an unsubscribe function. */
function on(channel, handler) {
  const listener = (_event, payload) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('api', {
  ollama: {
    status: () => call('ollama:status'),
    start: () => call('ollama:start'),
    setHost: (host) => call('ollama:set-host', host),
    list: () => call('ollama:list'),
    running: () => call('ollama:running'),
    show: (name) => call('ollama:show', name),
    remove: (name) => call('ollama:delete', name),
    copy: (source, destination) => call('ollama:copy', source, destination),
    pull: (name) => call('ollama:pull', name),
    cancelPull: (name) => call('ollama:cancel-pull', name),
    create: (spec) => call('ollama:create', spec),
    chat: (payload) => call('ollama:chat', payload),
    generate: (payload) => call('ollama:generate', payload),
    embed: (payload) => call('ollama:embed', payload),
    abort: (requestId) => call('ollama:abort', requestId),
    onChatEvent: (handler) => on('ollama:chat-event', handler),
    onPullProgress: (handler) => on('ollama:pull-progress', handler),
    onCreateProgress: (handler) => on('ollama:create-progress', handler),
    onServerState: (handler) => on('ollama:server-state', handler),
  },

  store: {
    listChats: () => call('store:list-chats'),
    searchChats: (query) => call('store:search-chats', query),
    getChat: (id) => call('store:get-chat', id),
    createChat: (init) => call('store:create-chat', init),
    saveChat: (chat) => call('store:save-chat', chat),
    patchChat: (id, patch) => call('store:patch-chat', id, patch),
    deleteChat: (id) => call('store:delete-chat', id),
    deleteAllChats: () => call('store:delete-all-chats'),
    stats: () => call('store:stats'),
  },

  settings: {
    get: () => call('settings:get'),
    set: (patch) => call('settings:set', patch),
  },

  files: {
    pickImages: () => call('files:pick-images'),
    pickDocuments: () => call('files:pick-documents'),
    readImages: (paths) => call('files:read-images', paths),
    exportChats: () => call('files:export-chats'),
    importChats: () => call('files:import-chats'),
    saveText: (payload) => call('files:save-text', payload),
  },

  app: {
    openExternal: (url) => call('app:open-external', url),
    showItem: (target) => call('app:show-item', target),
    info: () => call('app:info'),
    confirm: (payload) => call('app:confirm', payload),
    popupMenu: (position) => call('app:popup-menu', position),
    setTitleBarTheme: (theme) => call('app:titlebar-theme', theme),
    platform: process.platform,
    onMenu: (handler) => {
      const offNew = on('menu:new-chat', () => handler({ type: 'new-chat' }))
      const offSearch = on('menu:search', () => handler({ type: 'search' }))
      const offSettings = on('menu:settings', () => handler({ type: 'settings' }))
      const offRoute = on('menu:route', (route) => handler({ type: 'route', route }))
      return () => {
        offNew()
        offSearch()
        offSettings()
        offRoute()
      }
    },
  },
})
