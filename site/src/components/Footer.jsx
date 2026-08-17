import { REPO, VERSION, OLLAMA } from '../config.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src="./icon-512.png" alt="" />
              <span>Local Graph</span>
            </div>
            <p className="footer-desc">
              A desktop client for language models running on your own hardware.
            </p>
          </div>

          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#models">Models</a>
              </li>
              <li>
                <a href="#install">Install</a>
              </li>
              <li>
                <a href="#downloads">Downloads</a>
              </li>
              <li>
                <a href="#reference">Reference</a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Project</h4>
            <ul>
              <li>
                <a href={REPO} target="_blank" rel="noreferrer">
                  Source
                </a>
              </li>
              <li>
                <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
                  Issues
                </a>
              </li>
              <li>
                <a href={`${REPO}/blob/main/DISTRIBUTING.md`} target="_blank" rel="noreferrer">
                  Building
                </a>
              </li>
              <li>
                <a href={OLLAMA} target="_blank" rel="noreferrer">
                  Ollama
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="footer-base">
          Local Graph v{VERSION} · Models are served by Ollama; this project is not affiliated with it.
        </p>
      </div>
    </footer>
  )
}
