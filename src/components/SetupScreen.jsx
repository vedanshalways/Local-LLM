import { useState } from 'react'
import { Download, Terminal, Play, Globe, Warning } from '../lib/icons.jsx'
import { CopyButton, Spinner, useToast } from './ui.jsx'
import logoUrl from '../../assets/icon-512.png'

const INSTALL_URL = 'https://ollama.com/download'

const INSTALL_COMMAND = {
  darwin: 'brew install ollama',
  linux: 'curl -fsSL https://ollama.com/install.sh | sh',
  win32: 'winget install Ollama.Ollama',
}

/**
 * Shown when the local model server isn't available. Two distinct cases:
 * Ollama isn't installed at all, or it's installed but not currently serving.
 */
export default function SetupScreen({ status, onRecheck, onStartServer }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const platform = status?.platform || 'darwin'
  const command = INSTALL_COMMAND[platform] || INSTALL_COMMAND.darwin
  const installed = Boolean(status?.installed)

  const start = async () => {
    setBusy(true)
    try {
      const result = await onStartServer()
      if (!result?.started) toast(result?.error || 'Could not start the server.', 'error', 7000)
    } finally {
      setBusy(false)
    }
  }

  const recheck = async () => {
    setBusy(true)
    try {
      await onRecheck()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="setup">
      <div className="setup-card">
        <img className="setup-logo" src={logoUrl} alt="" />

        {installed ? (
          <>
            <h1>Start the model server</h1>
            <p>
              Ollama is installed on this computer but isn't running right now. Start it and your models become
              available immediately.
            </p>

            <div className="setup-steps">
              <div className="setup-step">
                <div className="step-num">
                  <Play size={12} />
                </div>
                <div className="step-body">
                  <div className="step-title">Start it from here</div>
                  <div className="step-text">
                    This launches the server in the background. It keeps running until you quit it.
                  </div>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-num">
                  <Terminal size={12} />
                </div>
                <div className="step-body">
                  <div className="step-title">Or start it yourself</div>
                  <div className="step-text">Run this in a terminal if you'd rather manage it manually:</div>
                  <div className="code-line">
                    <span>ollama serve</span>
                    <CopyButton text="ollama serve" className="code-copy" size={13} />
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-actions">
              <button className="btn accent" onClick={start} disabled={busy}>
                {busy ? <Spinner /> : <Play size={15} />}
                Start server
              </button>
              <button className="btn" onClick={recheck} disabled={busy}>
                Check again
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>One-time setup</h1>
            <p>
              This app runs language models directly on your computer using Ollama — a small, free engine that loads
              and serves the models. Install it once and everything else happens here.
            </p>

            <div className="setup-steps">
              <div className="setup-step">
                <div className="step-num">1</div>
                <div className="step-body">
                  <div className="step-title">Install Ollama</div>
                  <div className="step-text">Download the installer, or use the command line:</div>
                  <div className="code-line">
                    <span>{command}</span>
                    <CopyButton text={command} className="code-copy" size={13} />
                  </div>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-num">2</div>
                <div className="step-body">
                  <div className="step-title">Come back and press “Check again”</div>
                  <div className="step-text">
                    This app finds it automatically and starts the server for you.
                  </div>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-num">3</div>
                <div className="step-body">
                  <div className="step-title">Download a model</div>
                  <div className="step-text">
                    Pick one from the Models page. Llama 3.2 3B is a good first choice — around 2 GB and fast on most
                    laptops.
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-actions">
              <button className="btn accent" onClick={() => window.api.app.openExternal(INSTALL_URL)}>
                <Download size={15} />
                Download Ollama
              </button>
              <button className="btn" onClick={recheck} disabled={busy}>
                {busy && <Spinner />}
                Check again
              </button>
            </div>
          </>
        )}

        <div
          className="row"
          style={{ justifyContent: 'center', gap: 6, marginTop: 26, fontSize: 12.5, color: 'var(--text-tertiary)' }}
        >
          <Globe size={13} />
          <span>Everything runs locally — no account and no internet needed after setup.</span>
        </div>
      </div>
    </div>
  )
}

export { Warning }
