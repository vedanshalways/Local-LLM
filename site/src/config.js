/**
 * Everything version- or repo-specific lives here. Bumping a release is a
 * one-line change: set VERSION to match `version` in the app's package.json,
 * which is what electron-builder bakes into the installer filenames.
 */

export const VERSION = '1.0.0'
export const REPO = 'https://github.com/vedanshalways/Local-LLM'
export const RELEASES = `${REPO}/releases`
export const OLLAMA = 'https://ollama.com/download'

/** Asset URL on the GitHub Release created by .github/workflows/build.yml. */
const asset = (file) => `${RELEASES}/download/v${VERSION}/${file}`

export const DOWNLOADS = {
  mac: [
    {
      id: 'mac-arm64',
      label: 'Apple Silicon',
      note: 'M1 · M2 · M3 · M4',
      file: `LocalGraph-${VERSION}-mac-arm64.dmg`,
    },
    {
      id: 'mac-x64',
      label: 'Intel',
      note: '2020 and earlier',
      file: `LocalGraph-${VERSION}-mac-x64.dmg`,
    },
  ],
  windows: [
    {
      id: 'win-x64',
      label: '64-bit',
      note: 'Most PCs',
      file: `LocalGraph-${VERSION}-win-x64.exe`,
    },
    {
      id: 'win-arm64',
      label: 'ARM64',
      note: 'Snapdragon X · Surface Pro',
      file: `LocalGraph-${VERSION}-win-arm64.exe`,
    },
  ],
}

for (const builds of Object.values(DOWNLOADS)) {
  for (const build of builds) build.url = asset(build.file)
}

export const OS_LABELS = { mac: 'macOS', windows: 'Windows' }

/** Best guess at the visitor's platform, used only to order the buttons.
 *  Anything that isn't a Mac falls back to Windows. */
export function detectOS() {
  if (typeof navigator === 'undefined') return 'windows'
  const hint = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent
  const value = hint.toLowerCase()
  return value.includes('mac') || value.includes('darwin') ? 'mac' : 'windows'
}
