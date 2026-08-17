import { DOWNLOADS, OS_LABELS, VERSION, REPO } from '../config.js'
import AppWindow from './AppWindow.jsx'

const SPEC = [
  { label: 'Where it runs', value: 'Your machine only' },
  { label: 'Account', value: 'Not required' },
  { label: 'Installer', value: '~90 MB' },
  { label: 'Platforms', value: 'macOS · Windows' },
]

export default function Hero({ os, onSelectOS }) {
  const [primary, secondary] = DOWNLOADS[os]
  const otherOS = Object.keys(DOWNLOADS).filter((key) => key !== os)

  return (
    <section className="hero" id="top">
      <div className="container">
        <p className="eyebrow">Local LLM desktop app</p>
        <h1>Chat with models that run on your own computer.</h1>
        <p className="hero-lede">
          Local Graph is a desktop client for language models served from your machine. Streaming replies,
          image understanding, searchable history and a built-in model library — with nothing sent to a
          server.
        </p>

        <div className="hero-actions">
          <a className="btn btn-primary" href={primary.url}>
            Download for {OS_LABELS[os]}
          </a>
          <a className="btn btn-secondary" href={REPO} target="_blank" rel="noreferrer">
            View source
          </a>
        </div>

        <div className="hero-meta">
          {secondary && (
            <a className="btn-arch" href={secondary.url}>
              {OS_LABELS[os]} · {secondary.label}
            </a>
          )}
          {otherOS.map((key) => (
            <button key={key} type="button" className="btn-arch" onClick={() => onSelectOS(key)}>
              {OS_LABELS[key]}
            </button>
          ))}
          <span>Version {VERSION}</span>
          <span>
            Requires{' '}
            <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
              Ollama
            </a>
          </span>
        </div>
      </div>

      <div className="window-wrap">
        <AppWindow />
      </div>

      <div className="container">
        <dl className="spec">
          {SPEC.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
