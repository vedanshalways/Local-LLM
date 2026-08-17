import {
  Sidebar, Search, PenSquare, Boxes, Paperclip, ArrowUp, ChevronDown, Plus, DotsVertical, Settings,
} from './icons.jsx'

/**
 * The app's interface rebuilt in CSS at its real metrics (1360×900, 268px
 * sidebar, 760px content column) and scaled as one unit. It stays sharp at any
 * width, follows the same tokens as the product, and can't go stale the way a
 * screenshot would.
 */
export default function AppWindow() {
  return (
    <div className="window" aria-hidden="true">
      <div className="w-titlebar">
        <div className="w-tab">
          <img src="./icon-512.png" alt="" />
          <span>Explain gradient descent</span>
        </div>
        <span className="w-icon">
          <Plus />
        </span>
        <div className="w-spacer" />
        <span className="w-icon">
          <DotsVertical />
        </span>
        <div className="w-caption">
          <span>—</span>
          <span>▢</span>
          <span>✕</span>
        </div>
      </div>

      <div className="w-body">
        <aside className="w-side">
          <div className="w-side-head">
            <span className="w-btn">
              <Sidebar />
            </span>
            <div>
              <span className="w-btn">
                <Search />
              </span>
              <span className="w-btn">
                <PenSquare />
              </span>
            </div>
          </div>

          <div className="w-nav">
            <div className="w-nav-item active">
              <PenSquare />
              <span>New chat</span>
            </div>
            <div className="w-nav-item">
              <Boxes />
              <span>Models</span>
              <span className="w-badge">7</span>
            </div>
          </div>

          <div className="w-list">
            <div className="w-group">Today</div>
            <div className="w-chat active">Explain gradient descent</div>
            <div className="w-chat">Rewrite this paragraph</div>
            <div className="w-chat">Regex for ISO 8601 dates</div>
            <div className="w-group">Yesterday</div>
            <div className="w-chat">Summarise these meeting notes</div>
            <div className="w-chat">Unit tests for the parser</div>
          </div>

          <div className="w-side-foot">
            <div className="w-account">
              <span className="w-avatar">
                <Settings />
              </span>
              <div>
                <div className="w-account-name">Settings</div>
                <div className="w-account-sub">Local · private</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="w-main">
          <div className="w-topbar">
            <span className="w-model">
              llama3.2:8b
              <ChevronDown />
            </span>
          </div>

          <div className="w-thread">
            <div className="w-msg user">
              <div className="w-bubble">Explain gradient descent in two sentences.</div>
            </div>
            <div className="w-msg">
              <div className="w-answer">
                <p>
                  Gradient descent finds the minimum of a loss function by repeatedly stepping in the
                  direction that reduces it fastest — the negative of the gradient.
                </p>
                <p>
                  The size of each step is the learning rate: too small and training crawls, too large and
                  the updates overshoot the minimum entirely.
                </p>
                <div className="w-stats">142 tok/s · 0.9s · llama3.2:8b</div>
              </div>
            </div>
          </div>

          <div className="w-dock">
            <div className="w-composer-glow">
              <div className="w-composer">
                <div className="w-composer-row">
                  <span className="w-composer-btn">
                    <Paperclip />
                  </span>
                  <span className="w-placeholder">Message llama3.2:8b…</span>
                  <span className="w-send">
                    <ArrowUp />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
