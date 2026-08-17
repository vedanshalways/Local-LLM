import { DOWNLOADS, REPO } from '../config.js'

export default function Nav({ os }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href="#top">
          <img src="./icon-512.png" alt="" />
          <span>Local Graph</span>
        </a>

        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#models">Models</a>
          <a href="#install">Install</a>
          <a href="#downloads">Downloads</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="btn btn-primary btn-sm" href={DOWNLOADS[os][0].url}>
            Download
          </a>
        </nav>
      </div>
    </header>
  )
}
