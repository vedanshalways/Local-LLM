'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Menu } = require('electron')
const path = require('path')
const fs = require('fs/promises')

const { OllamaClient, DEFAULT_HOST } = require('./ollama')
const { LocalStore } = require('./store')

// Only `npm run dev` sets NODE_ENV — everything else loads the built bundle,
// including an unpackaged `npm start`.
const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = 'http://localhost:5199' // must match server.port in vite.config.mjs

let mainWindow = null
let store = null
let ollama = null

const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png')

const isMac = process.platform === 'darwin'

// Height of the custom Chrome-style title bar drawn by the renderer. The native
// window-control overlay has to match it exactly or the buttons sit off-centre.
const TITLEBAR_HEIGHT = 40

/** Caption-button colours for the overlay — these must track the app theme. */
function overlayFor(theme) {
  return theme === 'dark'
    ? { color: '#101014', symbolColor: '#d4d4d8', height: TITLEBAR_HEIGHT }
    : { color: '#e7e7ec', symbolColor: '#3f3f46', height: TITLEBAR_HEIGHT }
}

/** Resolve the stored preference ('system' included) to a concrete theme. */
function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

function createWindow(theme) {
  mainWindow = new BrowserWindow({
    icon: ICON_PATH,
    width: 1360,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: theme === 'dark' ? '#101014' : '#e7e7ec',
    // Both platforms hide the system title bar; the renderer draws its own strip
    // with the traffic lights (mac) or the overlay buttons (Windows/Linux) in it.
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? {} : { titleBarOverlay: overlayFor(theme) }),
    trafficLightPosition: { x: 14, y: 12 },
    // The menu bar lives behind the ⋮ button now; keeping the menu installed but
    // hidden is what keeps its accelerators (Ctrl+N, Ctrl+K, …) working.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
      // Keep streaming responses painting smoothly when the window isn't focused.
      backgroundThrottling: false,
    },
  })

  if (!isMac) mainWindow.setMenuBarVisibility(false)

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Never leave the user staring at nothing if the first paint doesn't arrive.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show()
  }, 4000)

  mainWindow.webContents.on('did-fail-load', (_e, code, description, url) => {
    console.error(`Failed to load ${url}: ${description} (${code})`)
  })

  if (isDev) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Anything that tries to open a new window goes to the system browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith(DEV_URL) || url.startsWith('file://')
    if (!isLocal) {
      event.preventDefault()
      if (/^https?:\/\//.test(url)) shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => send('menu:new-chat'),
        },
        {
          label: 'Search Chats',
          accelerator: 'CmdOrCtrl+K',
          click: () => send('menu:search'),
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => send('menu:settings'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Chats', accelerator: 'CmdOrCtrl+1', click: () => send('menu:route', 'chat') },
        { label: 'Models', accelerator: 'CmdOrCtrl+2', click: () => send('menu:route', 'models') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * The single flat menu behind the ⋮ button, in Chrome's order: the things you
 * reach for first at the top, window plumbing at the bottom.
 */
function buildAppMenu() {
  return Menu.buildFromTemplate([
    { label: 'New chat', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new-chat') },
    { label: 'Search chats', accelerator: 'CmdOrCtrl+K', click: () => send('menu:search') },
    { type: 'separator' },
    { label: 'Chats', accelerator: 'CmdOrCtrl+1', click: () => send('menu:route', 'chat') },
    { label: 'Models', accelerator: 'CmdOrCtrl+2', click: () => send('menu:route', 'models') },
    { type: 'separator' },
    { label: 'Zoom in', role: 'zoomIn' },
    { label: 'Zoom out', role: 'zoomOut' },
    { label: 'Reset zoom', role: 'resetZoom' },
    { label: 'Full screen', role: 'togglefullscreen' },
    { type: 'separator' },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'More tools', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }] },
    { type: 'separator' },
    { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => send('menu:settings') },
    { type: 'separator' },
    isMac ? { role: 'close' } : { label: 'Exit', role: 'quit' },
  ])
}

app.whenReady().then(boot).catch((err) => {
  console.error('Startup failed:', err)
  dialog.showErrorBox('Local Graph could not start', String(err?.stack || err))
  app.quit()
})

async function boot() {
  // Packaged macOS builds take the icon from the bundle; running unpackaged needs
  // it set explicitly or the dock shows the default Electron icon.
  if (isMac && !app.isPackaged && app.dock) {
    try {
      app.dock.setIcon(ICON_PATH)
    } catch {
      /* icon not generated yet — npm run icons */
    }
  }

  store = new LocalStore(app.getPath('userData'))
  const settings = await store.getSettings()
  ollama = new OllamaClient(settings.ollamaHost || DEFAULT_HOST)
  nativeTheme.themeSource = settings.theme === 'system' ? 'system' : settings.theme

  registerIpc()
  buildMenu()
  createWindow(resolveTheme(settings.theme))

  // Bring the local server up in the background so the first chat isn't blocked on it.
  if (settings.autoStartServer) {
    ollama
      .startServer()
      .then((result) => send('ollama:server-state', result))
      .catch(() => {})
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(resolveTheme(settings.theme))
  })
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

app.on('window-all-closed', () => {
  if (ollama) ollama.abortAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (ollama) ollama.abortAll()
})

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })
}

function registerIpc() {
  // ------------------------------------------------------------- ollama core
  handle('ollama:status', () => ollama.status())
  handle('ollama:start', () => ollama.startServer())
  handle('ollama:list', () => ollama.listModels())
  handle('ollama:running', () => ollama.listRunning())
  handle('ollama:show', (name) => ollama.showModel(name))
  handle('ollama:delete', (name) => ollama.deleteModel(name))
  handle('ollama:copy', (source, destination) => ollama.copyModel(source, destination))

  handle('ollama:set-host', async (host) => {
    ollama.setHost(host)
    await store.saveSettings({ ollamaHost: ollama.host })
    return ollama.status()
  })

  handle('ollama:pull', (name) =>
    ollama.pullModel(name, (progress) => send('ollama:pull-progress', progress)),
  )

  handle('ollama:create', (spec) =>
    ollama.createModel(spec, (progress) =>
      send('ollama:create-progress', { model: spec.name, ...progress }),
    ),
  )

  handle('ollama:cancel-pull', (name) => ollama.abort(`pull:${name}`))
  handle('ollama:abort', (requestId) => ollama.abort(requestId))

  // ------------------------------------------------------------------- chat
  handle('ollama:chat', (payload) =>
    ollama.chat(payload, (event) => send('ollama:chat-event', { requestId: payload.requestId, ...event })),
  )

  handle('ollama:generate', (payload) => ollama.generateOnce(payload))
  handle('ollama:embed', (payload) => ollama.embed(payload))

  // ------------------------------------------------------------------ store
  handle('store:list-chats', () => store.listChats())
  handle('store:search-chats', (query) => store.searchChats(query))
  handle('store:get-chat', (id) => store.getChat(id))
  handle('store:create-chat', (init) => store.createChat(init))
  handle('store:save-chat', (chat) => store.saveChat(chat))
  handle('store:patch-chat', (id, patch) => store.patchChat(id, patch))
  handle('store:delete-chat', (id) => store.deleteChat(id))
  handle('store:delete-all-chats', () => store.deleteAllChats())
  handle('store:stats', () => store.stats())

  handle('settings:get', () => store.getSettings())
  handle('settings:set', async (patch) => {
    const next = await store.saveSettings(patch)
    if (patch.theme) nativeTheme.themeSource = patch.theme === 'system' ? 'system' : patch.theme
    if (patch.ollamaHost) ollama.setHost(patch.ollamaHost)
    return next
  })

  // ------------------------------------------------------------------- files
  handle('files:pick-images', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Attach images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    })
    if (result.canceled) return []
    return Promise.all(result.filePaths.map(readImageFile))
  })

  handle('files:pick-documents', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Attach files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Text & code',
          extensions: [
            'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'yaml', 'yml', 'xml', 'html', 'css',
            'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'hpp',
            'cs', 'php', 'sh', 'sql', 'toml', 'ini', 'log',
          ],
        },
        { name: 'All files', extensions: ['*'] },
      ],
    })
    if (result.canceled) return []

    const files = []
    for (const filePath of result.filePaths) {
      const stat = await fs.stat(filePath)
      // Cap at 2 MB — beyond that we'd blow past any local model's context anyway.
      if (stat.size > 2 * 1024 * 1024) {
        files.push({ name: path.basename(filePath), error: 'File is larger than 2 MB.' })
        continue
      }
      const text = await fs.readFile(filePath, 'utf8')
      files.push({ name: path.basename(filePath), size: stat.size, text })
    }
    return files
  })

  handle('files:read-images', (paths) => Promise.all(paths.map(readImageFile)))

  handle('files:export-chats', async () => {
    const payload = await store.exportAll()
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export all chats',
      defaultPath: `local-graph-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { canceled: false, path: result.filePath, chats: payload.chats.length }
  })

  handle('files:import-chats', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import chats',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    const payload = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'))
    return { canceled: false, ...(await store.importAll(payload)) }
  })

  handle('files:save-text', async ({ suggestedName, contents }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save',
      defaultPath: suggestedName || 'chat.md',
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    await fs.writeFile(result.filePath, contents, 'utf8')
    return { canceled: false, path: result.filePath }
  })

  // -------------------------------------------------------------------- app
  handle('app:open-external', (url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { ok: true }
  })

  // Drop the ⋮ menu right under the button that opened it, Chrome-style.
  handle('app:popup-menu', ({ x, y } = {}) => {
    buildAppMenu().popup({
      window: mainWindow,
      x: Math.round(x ?? 0),
      y: Math.round(y ?? TITLEBAR_HEIGHT),
    })
    return { ok: true }
  })

  // The renderer owns theme resolution ('system' included), so it tells us which
  // colours to paint the caption buttons in.
  handle('app:titlebar-theme', (theme) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false }
    const overlay = overlayFor(theme)
    mainWindow.setBackgroundColor(overlay.color)
    if (!isMac) {
      try {
        mainWindow.setTitleBarOverlay(overlay)
      } catch {
        /* overlay unsupported on this platform — the strip still renders */
      }
    }
    return { ok: true }
  })

  handle('app:show-item', (target) => {
    shell.showItemInFolder(target)
    return { ok: true }
  })

  handle('app:info', async () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    userData: app.getPath('userData'),
    totalMemoryGB: Math.round((require('os').totalmem() / 1024 ** 3) * 10) / 10,
    cpus: require('os').cpus().length,
  }))

  handle('app:confirm', async ({ title, message, detail, confirmLabel = 'Delete' }) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: [confirmLabel, 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: title || 'Are you sure?',
      message: message || '',
      detail: detail || '',
    })
    return { confirmed: result.response === 0 }
  })
}

async function readImageFile(filePath) {
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mime =
    ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'png'
        ? 'image/png'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'application/octet-stream'
  const base64 = buffer.toString('base64')
  return {
    name: path.basename(filePath),
    size: buffer.length,
    mime,
    base64, // raw base64 for the Ollama API
    dataUrl: `data:${mime};base64,${base64}`, // ready to render in an <img>
  }
}
