/** The app's own icon set (src/lib/icons.jsx), trimmed to what the page uses. */

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Icon = ({ children, size = 18, ...rest }) => (
  <svg {...base} width={size} height={size} {...rest}>
    {children}
  </svg>
)

export const Download = (p) => (
  <Icon {...p}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </Icon>
)

export const Sidebar = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Icon>
)

export const Search = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const PenSquare = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
)

export const Boxes = (p) => (
  <Icon {...p}>
    <path d="M12 2 3 7l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </Icon>
)

export const Paperclip = (p) => (
  <Icon {...p}>
    <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19l-9.2 9.19a1.83 1.83 0 0 1-2.59-2.6l8.49-8.48" />
  </Icon>
)

export const ArrowUp = (p) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </Icon>
)

export const ChevronDown = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const Plus = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const Settings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.5.55.9 1.06 1H21a2 2 0 1 1 0 4h-.09c-.5.02-.94.35-1.11.82Z" />
  </Icon>
)

export const DotsVertical = (p) => (
  <Icon {...p} strokeWidth={2.4}>
    <circle cx="12" cy="5" r=".6" />
    <circle cx="12" cy="12" r=".6" />
    <circle cx="12" cy="19" r=".6" />
  </Icon>
)
