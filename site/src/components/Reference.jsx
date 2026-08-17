const SHORTCUTS = [
  ['⌘ / Ctrl + N', 'New chat'],
  ['⌘ / Ctrl + K', 'Search chats'],
  ['⌘ / Ctrl + B', 'Toggle sidebar'],
  ['⌘ / Ctrl + ,', 'Settings'],
  ['⌘ / Ctrl + 1 · 2', 'Chats · Models'],
  ['Shift + Enter', 'New line'],
]

const DATA = [
  ['macOS', '~/Library/Application Support/local-graph'],
  ['Windows', '%APPDATA%/local-graph'],
  ['Models', '~/.ollama (managed by Ollama)'],
]

export default function Reference() {
  return (
    <section className="section" id="reference">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Reference</p>
          <h2>Where things live</h2>
          <p>
            One JSON file per conversation and one for settings. Delete the folder and the app is back to a
            clean install.
          </p>
        </div>

        <div className="reference">
          <div>
            <h3>Keyboard</h3>
            <dl>
              {SHORTCUTS.map(([keys, action]) => (
                <div style={{ display: 'contents' }} key={keys}>
                  <dt>{keys}</dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3>Storage</h3>
            <dl>
              {DATA.map(([platform, location]) => (
                <div style={{ display: 'contents' }} key={platform}>
                  <dt>{platform}</dt>
                  <dd>{location}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
