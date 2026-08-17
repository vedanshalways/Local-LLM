import { DOWNLOADS, OS_LABELS, OLLAMA } from '../config.js'

/** The builds are unsigned on purpose (DISTRIBUTING.md), so the OS warnings are
 *  documented here rather than left as a surprise on first launch. */
const STEPS = {
  windows: [
    { title: 'Run the installer', body: 'The .exe installs per user, so no administrator rights are needed.' },
    {
      title: 'Clear SmartScreen',
      body: 'Windows shows “Windows protected your PC” for unsigned installers. Choose More info, then Run anyway.',
    },
    { title: 'Install Ollama', body: 'The engine that serves the models.', code: 'winget install Ollama.Ollama' },
    { title: 'Start the server', body: 'Open the app and press Set it up → Start server. It starts automatically on every launch after that.' },
  ],
  mac: [
    { title: 'Open the disk image', body: 'Drag Local Graph to Applications. Apple Silicon and Intel are separate builds.' },
    {
      title: 'Clear Gatekeeper',
      body: 'The build is unsigned, so the first launch needs right-click → Open → Open. Without it macOS reports the app as damaged, which here means unsigned and downloaded from the internet.',
      code: 'xattr -cr "/Applications/Local Graph.app"',
    },
    { title: 'Install Ollama', body: 'The engine that serves the models.', code: 'brew install ollama' },
    { title: 'Start the server', body: 'Open the app and press Set it up → Start server. It starts automatically on every launch after that.' },
  ],
}

const REQUIREMENTS = {
  windows: [['OS', 'Windows 10 or later'], ['Memory', '8 GB minimum'], ['Disk', '~90 MB + models'], ['Engine', 'Ollama']],
  mac: [['OS', 'macOS 11 or later'], ['Memory', '8 GB minimum'], ['Disk', '~90 MB + models'], ['Engine', 'Ollama']],
}

export default function Install({ os, onSelectOS }) {
  return (
    <section className="section" id="install">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Getting started</p>
          <h2>Two downloads, then you're local</h2>
          <p>One for the app, one for the engine that runs the models. Nothing else to configure.</p>
        </div>

        <div className="install">
          <div>
            <div className="tabs" role="tablist">
              {Object.keys(DOWNLOADS).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={key === os}
                  className={key === os ? 'tab active' : 'tab'}
                  onClick={() => onSelectOS(key)}
                >
                  {OS_LABELS[key]}
                </button>
              ))}
            </div>

            <ol className="steps">
              {STEPS[os].map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {step.code && <code className="snippet">{step.code}</code>}
                </li>
              ))}
            </ol>
          </div>

          <aside className="aside">
            <h3>Requirements</h3>
            <dl>
              {REQUIREMENTS[os].map(([term, value]) => (
                <div style={{ display: 'contents' }} key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              Models are downloaded separately by{' '}
              <a href={OLLAMA} target="_blank" rel="noreferrer">
                Ollama
              </a>{' '}
              into your home directory — a small model is about 2 GB, a large one 40 GB or more.
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
