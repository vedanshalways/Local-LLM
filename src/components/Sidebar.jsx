import { useEffect, useRef, useState } from 'react'
import {
  PenSquare, Search, Sidebar as SidebarIcon, Boxes, Dots, Trash, Pencil, Pin, Settings as SettingsIcon,
} from '../lib/icons.jsx'
import { groupChats, classNames } from '../lib/format.js'
import { useDismiss } from './ui.jsx'

export default function Sidebar({
  collapsed,
  chats,
  activeChatId,
  route,
  onToggle,
  onNewChat,
  onOpenChat,
  onOpenSearch,
  onOpenSettings,
  onRoute,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  modelCount,
}) {
  const [menuFor, setMenuFor] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const renameRef = useRef(null)

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [renamingId])

  const startRename = (chat) => {
    setMenuFor(null)
    setRenamingId(chat.id)
    setDraftTitle(chat.title)
  }

  const commitRename = () => {
    const title = draftTitle.trim()
    if (renamingId && title) onRenameChat(renamingId, title)
    setRenamingId(null)
  }

  const groups = groupChats(chats)

  return (
    <aside className={classNames('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-header">
        <button className="icon-btn" onClick={onToggle} title="Close sidebar" aria-label="Close sidebar">
          <SidebarIcon size={19} />
        </button>
        <div className="row">
          <button className="icon-btn" onClick={onOpenSearch} title="Search chats (⌘K)" aria-label="Search chats">
            <Search size={19} />
          </button>
          <button className="icon-btn" onClick={onNewChat} title="New chat (⌘N)" aria-label="New chat">
            <PenSquare size={19} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={classNames('nav-item', route === 'chat' && !activeChatId && 'active')}
          onClick={onNewChat}
        >
          <PenSquare size={17} />
          <span>New chat</span>
        </button>
        <button className={classNames('nav-item', route === 'models' && 'active')} onClick={() => onRoute('models')}>
          <Boxes size={17} />
          <span>Models</span>
          {modelCount > 0 && <span className="nav-badge">{modelCount}</span>}
        </button>
      </nav>

      <div className="sidebar-scroll">
        {chats.length === 0 && (
          <div className="sidebar-empty">
            No chats yet.
            <br />
            Start one and it saves here automatically.
          </div>
        )}

        {groups.map(([label, items]) => (
          <div key={label}>
            <div className="chat-group-label">{label}</div>
            {items.map((chat) => (
              <div
                key={chat.id}
                className={classNames(
                  'chat-item',
                  chat.id === activeChatId && route === 'chat' && 'active',
                  menuFor === chat.id && 'menu-open',
                )}
              >
                {renamingId === chat.id ? (
                  <input
                    ref={renameRef}
                    className="chat-item-rename"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                  />
                ) : (
                  <>
                    <button className="chat-item-main" onClick={() => onOpenChat(chat.id)} title={chat.title}>
                      {chat.title}
                    </button>
                    <ChatMenu
                      open={menuFor === chat.id}
                      onOpen={() => setMenuFor(chat.id)}
                      onClose={() => setMenuFor(null)}
                      pinned={chat.pinned}
                      onRename={() => startRename(chat)}
                      onPin={() => {
                        setMenuFor(null)
                        onTogglePin(chat.id, !chat.pinned)
                      }}
                      onDelete={() => {
                        setMenuFor(null)
                        onDeleteChat(chat.id)
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="account-row" onClick={onOpenSettings}>
          <div className="avatar">
            <SettingsIcon size={18} />
          </div>
          <div className="account-meta">
            <div className="account-name">Settings</div>
            <div className="account-sub">Local · private</div>
          </div>
        </button>
      </div>
    </aside>
  )
}

function ChatMenu({ open, onOpen, onClose, onRename, onDelete, onPin, pinned }) {
  const ref = useDismiss(() => open && onClose())

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="chat-item-menu"
        onClick={(e) => {
          e.stopPropagation()
          open ? onClose() : onOpen()
        }}
        aria-label="Chat options"
      >
        <Dots size={16} />
      </button>

      {open && (
        <div className="dropdown right" style={{ minWidth: 168 }}>
          <button className="dropdown-item" onClick={onPin}>
            <Pin size={16} />
            <div className="di-body">{pinned ? 'Unpin' : 'Pin to top'}</div>
          </button>
          <button className="dropdown-item" onClick={onRename}>
            <Pencil size={16} />
            <div className="di-body">Rename</div>
          </button>
          <div className="dropdown-sep" />
          <button className="dropdown-item danger" onClick={onDelete}>
            <Trash size={16} />
            <div className="di-body">Delete</div>
          </button>
        </div>
      )}
    </div>
  )
}
