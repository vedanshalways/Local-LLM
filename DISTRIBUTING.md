# Distributing Local Graph

How to produce installers other people can download and run.

---

## What you get

| Platform | File | Notes |
| --- | --- | --- |
| macOS (Apple Silicon) | `LocalGraph-1.0.0-mac-arm64.dmg` | M1/M2/M3/M4 |
| macOS (Intel) | `LocalGraph-1.0.0-mac-x64.dmg` | 2020 and earlier |
| Windows | `LocalGraph-1.0.0-win-x64.exe` | NSIS installer, per-user (no admin needed) |
| Linux | `LocalGraph-1.0.0-linux-x86_64.AppImage` | `chmod +x` and run |
| Linux (Debian/Ubuntu) | `LocalGraph-1.0.0-linux-amd64.deb` | `sudo apt install ./file.deb` |

Everything lands in `release/`.

## Building

```bash
npm run dist:mac      # only on macOS
npm run dist:win      # only on Windows (or Linux with wine)
npm run dist:linux    # only on Linux
```

**You can't cross-build everything from one machine.** Windows installers need wine,
`.deb` needs dpkg/fakeroot. Rather than fight that, `.github/workflows/build.yml`
builds each platform on its own GitHub runner:

```bash
git init && git add -A && git commit -m "Local Graph"
gh repo create local-graph --private --source=. --push

git tag v1.0.0 && git push --tags     # builds all 3 platforms, drafts a release
```

Or trigger it by hand from the repo's **Actions → Build installers → Run workflow**,
and download the artifacts from the run.

## Before you ship a new version

Bump `version` in `package.json` — it's baked into the filenames and shown in
Settings → About.

---

## Installing on another computer

Tell people two things: the Gatekeeper step, and that they need Ollama.

### macOS

The builds are **unsigned** (see below), so macOS quarantines them. After dragging
Local Graph to Applications, either:

- **Right-click the app → Open → Open** (only needed the first time), or
- run `xattr -cr "/Applications/Local Graph.app"`

Without this, macOS says *"Local Graph is damaged and can't be opened"* — which is
misleading; it just means unsigned and downloaded from the internet.

### Windows

SmartScreen will show *"Windows protected your PC"* for an unsigned installer.
**More info → Run anyway.**

### Linux

```bash
chmod +x LocalGraph-1.0.0-linux-x86_64.AppImage
./LocalGraph-1.0.0-linux-x86_64.AppImage
```

### Then: install Ollama

Local Graph is the interface; the models are served by
[Ollama](https://ollama.com/download). The app detects it, starts it, and downloads
models through it — but it has to be installed first. If it isn't, the app opens
normally and shows a setup panel with a download link.

Anyone you share this with will need to install Ollama once, then pick a model from
the Models page.

---

## Signing

Builds are **ad-hoc signed on purpose**. `package.json` sets `"identity": null` in the
`mac` block, which stops electron-builder from auto-discovering whatever certificate
happens to be in your keychain.

That default matters. Without it, a personal *Apple Development* certificate gets
picked up automatically — which embeds your name and email in the signature of every
copy you hand out, and still fails Gatekeeper on other machines, because development
certificates aren't valid for distribution. You get the downside of signing with none
of the benefit.

Ad-hoc signing gives every user the same predictable behaviour: one Gatekeeper prompt,
cleared with right-click → Open.

To sign properly instead:

### macOS — Apple Developer Program ($99/yr)

Remove `"identity": null` from the `mac` block, export a *Developer ID Application*
certificate as `.p12`, then set:

```bash
export CSC_LINK=/path/to/cert.p12
export CSC_KEY_PASSWORD='...'
export APPLE_ID='you@example.com'
export APPLE_APP_SPECIFIC_PASSWORD='xxxx-xxxx-xxxx-xxxx'
export APPLE_TEAM_ID='XXXXXXXXXX'
npm run dist:mac
```

Add `"notarize": { "teamId": "XXXXXXXXXX" }` to the `mac` block in `package.json`.
Notarized builds open with no warning at all.

In CI, store those as repository secrets and drop the
`CSC_IDENTITY_AUTO_DISCOVERY: false` line from the workflow.

### Windows — code signing certificate (~$100–400/yr)

```bash
export CSC_LINK=/path/to/cert.pfx
export CSC_KEY_PASSWORD='...'
```

An EV certificate clears SmartScreen immediately; a standard OV one builds
reputation over time.

Neither is required — plenty of open-source apps ship unsigned with install notes.

---

## Auto-updates

Not wired up. If you want them: add `electron-updater`, set `publish` to your
GitHub repo in `package.json`, and call `autoUpdater.checkForUpdatesAndNotify()`
on startup. macOS auto-updates require a signed build.

## Size

Each installer is 80–100 MB — almost entirely the Electron runtime, which every
Electron app carries. Model weights are **not** bundled; Ollama downloads them into
`~/.ollama` on the user's machine.

The renderer's libraries (React, KaTeX, highlight.js, …) live in `devDependencies`
on purpose: Vite bundles them into `dist/` at build time, so listing them as runtime
`dependencies` would make electron-builder ship a second copy inside the app as
`node_modules`. The main process only uses Node built-ins, so `dependencies` stays
empty.

## Testing an installer before you share it

Copy the app out of the mounted DMG with `ditto`, not `cp -R` — `cp -R` mangles the
symlinks inside `Electron Framework.framework` and invalidates the code signature,
which makes the app start with no window and no error. Finder's own drag-to-Applications
does the right thing; only command-line testing needs the care.

```bash
hdiutil attach release/LocalGraph-1.0.0-mac-arm64.dmg -nobrowse -mountpoint /tmp/lg
ditto "/tmp/lg/Local Graph.app" "/tmp/Local Graph.app"
hdiutil detach /tmp/lg
codesign --verify --deep --strict "/tmp/Local Graph.app"   # should print nothing
open "/tmp/Local Graph.app"
```
