# Local Graph

A desktop app for chatting with language models that run entirely on your own computer.
ChatGPT-style interface, local chat history, image understanding, and a built-in model
library for downloading new models.

Nothing is sent to a server. No account, no telemetry, works offline once a model is downloaded.

---

## Installing

Grab the file for your machine, then install Ollama when the app asks.

| Platform | File |
| --- | --- |
| macOS (Apple Silicon) | `LocalGraph-<version>-mac-arm64.dmg` |
| macOS (Intel) | `LocalGraph-<version>-mac-x64.dmg` |
| Windows | `LocalGraph-<version>-win-x64.exe` |
| Linux | `LocalGraph-<version>-linux-x86_64.AppImage` or `.deb` |

**macOS:** the builds are unsigned, so the first launch needs
**right-click → Open → Open** (or `xattr -cr "/Applications/Local Graph.app"`).
Otherwise macOS claims the app is "damaged", which really means "unsigned and
downloaded from the internet".

**Windows:** SmartScreen shows a warning for unsigned installers —
**More info → Run anyway**.

Building and shipping these is covered in [DISTRIBUTING.md](DISTRIBUTING.md).

## Running from source

```bash
npm install
npm start          # build the UI and open the app
npm run dev        # development mode with hot reload
```

The app icon is generated from `assets/logo.png`. If you swap the logo, regenerate it:

```bash
npm run icons     # rebuilds assets/icon.png, icon-512.png and icon.icns
```

To produce an installable app:

```bash
npm run dist:mac     # .dmg for macOS
npm run dist:win     # .exe installer for Windows
npm run dist:linux   # AppImage + .deb
```

## One-time setup: the model engine

Models are served by [Ollama](https://ollama.com), a small free engine that runs in the
background. The app detects it, starts it, and manages models through it — you never need
to touch a terminal after installing it.

**Install it** from <https://ollama.com/download>, or via a package manager:

| Platform | Command |
| --- | --- |
| macOS | `brew install ollama` |
| Linux | `curl -fsSL https://ollama.com/install.sh \| sh` |
| Windows | `winget install Ollama.Ollama` |

Then open the app and press **Set it up → Start server**. The app auto-starts the server on
every launch after that.

Until it's running, the app still opens normally — you just can't send messages. The banner
at the top links to the setup panel.

## Features

**Chat**
- Streaming responses, token by token
- Full markdown: headings, lists, tables, LaTeX math, and syntax-highlighted code blocks with copy buttons
- Image upload for vision models (llava, llama3.2-vision, gemma3, moondream…) — file picker, drag & drop, or paste.
  Vision support is read from the model's own declared capabilities, so attaching an image to a text-only model
  is caught before the request is sent, with the option to switch models, download one, or send without images
- Text and code file attachments folded into your message
- Edit any message to rewind and re-ask from that point
- Regenerate, copy, or delete individual messages
- Stop a response mid-generation
- Collapsible thought process for reasoning models (deepseek-r1, qwq)
- Tokens/sec and generation time under each reply

**Chat history**
- Saved automatically as JSON on your machine, grouped by Today / Yesterday / Previous 7 days
- Auto-titled by the model after your first message
- Rename, pin, and delete
- Full-text search across every conversation (⌘K)
- Export and import everything as a single JSON file

**Models page**
- Everything installed, with size, parameter count, quantization, and which are loaded in memory
- Badges for vision, reasoning, and embedding models
- **Discover** tab: a curated catalog across general / vision / reasoning / code / small / embedding
  categories, with size and RAM requirements, and live download progress you can cancel
- **Add by name** installs anything from the Ollama library, listed or not (e.g. `mixtral:8x7b`)
- Per-model detail: architecture, context length, prompt template, Modelfile, license
- Delete models to reclaim disk space

**Settings**
- Light / dark / system theme, message text size
- Default model and a system prompt applied to every chat
- Temperature, top-p, top-k, repeat penalty, context window, max response length
- Point at a model server on another machine on your network
- How long models stay loaded in memory
- Storage stats and one-click data export

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + N` | New chat |
| `⌘/Ctrl + K` | Search chats |
| `⌘/Ctrl + B` | Toggle sidebar |
| `⌘/Ctrl + ,` | Settings |
| `⌘/Ctrl + 1` / `2` | Chats / Models |
| `Enter` | Send (configurable) |
| `Shift + Enter` | New line |

## Where your data lives

| Platform | Location |
| --- | --- |
| macOS | `~/Library/Application Support/local-graph` |
| Windows | `%APPDATA%/local-graph` |
| Linux | `~/.config/local-graph` |

`chats/` holds one JSON file per conversation; `settings.json` holds your preferences.
Model weights are managed by Ollama, in `~/.ollama`.

## How it's built

```
electron/
  main.js       window, menus, IPC handlers
  preload.js    the contextBridge API the UI talks to
  ollama.js     HTTP client — streaming chat, pull/delete, server detection & autostart
  store.js      chat + settings persistence (atomic JSON writes)
src/
  App.jsx       app shell, routing, boot sequence
  components/   ChatPage, ModelsPage, Composer, Message, Sidebar, Settings, Setup, …
  lib/          model catalog, formatting helpers, icons
```

The renderer runs with `contextIsolation` on and no Node access; every privileged
operation goes through a narrow, explicitly enumerated IPC surface in `preload.js`.
