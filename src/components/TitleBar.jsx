import { Plus, DotsVertical, X } from '../lib/icons.jsx'
import { classNames } from '../lib/format.js'
import logoUrl from '../../assets/icon-512.png'

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

/**
 * Chrome-style title bar: the tab strip, the ⋮ menu and the window controls in
 * one row. On Windows/Linux the caption buttons are drawn natively into the
 * space this bar leaves free (see the env(titlebar-area-*) padding in CSS); on
 * macOS the traffic lights sit in the padded-out left edge.
 */
export default function TitleBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }) {
  const openMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    window.api?.app?.popupMenu({ x: rect.left, y: rect.bottom })
  }

  return (
    <header className="titlebar">
      <div className="titlebar-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            aria-selected={tab.id === activeTabId}
            className={classNames('titlebar-tab', tab.id === activeTabId && 'active')}
            title={tab.title}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectTab(tab.id)
              }
            }}
            // Middle-click closes, as it does in a browser.
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault()
                onCloseTab(tab.id)
              }
            }}
          >
            <img className="titlebar-tab-icon" src={logoUrl} alt="" aria-hidden="true" />
            <span className="titlebar-tab-label">{tab.title}</span>
            <button
              className="titlebar-tab-close"
              onClick={(event) => {
                event.stopPropagation()
                onCloseTab(tab.id)
              }}
              title="Close tab (Ctrl+W)"
              aria-label={`Close ${tab.title}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        <button className="titlebar-newtab" onClick={onNewTab} title="New tab (Ctrl+T)" aria-label="New tab">
          <Plus size={17} />
        </button>
      </div>

      <div className="titlebar-drag" />

      {!isMac && (
        <button className="titlebar-menu" onClick={openMenu} title="Customize and control Local Graph" aria-label="Menu">
          <DotsVertical size={18} />
        </button>
      )}
    </header>
  )
}
