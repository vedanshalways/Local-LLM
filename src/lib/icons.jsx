/** Thin-stroke icon set, sized by the parent's font-size via `1em` defaults. */

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

export const PenSquare = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
)

export const Search = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const Sidebar = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Icon>
)

export const Boxes = (p) => (
  <Icon {...p}>
    <path d="M12 2 3 7l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </Icon>
)

export const Settings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.5.55.9 1.06 1H21a2 2 0 1 1 0 4h-.09c-.5.02-.94.35-1.11.82Z" />
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

export const Stop = ({ size = 18, ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </svg>
)

export const Copy = (p) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
)

export const Check = (p) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="m4 12 5.5 5.5L20 7" />
  </Icon>
)

export const Refresh = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
)

export const Pencil = (p) => (
  <Icon {...p}>
    <path d="M17 3a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5Z" />
  </Icon>
)

export const Trash = (p) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const Dots = (p) => (
  <Icon {...p} strokeWidth={2.4}>
    <circle cx="5" cy="12" r=".6" />
    <circle cx="12" cy="12" r=".6" />
    <circle cx="19" cy="12" r=".6" />
  </Icon>
)

export const ChevronDown = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const ChevronRight = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const X = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
)

export const Download = (p) => (
  <Icon {...p}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </Icon>
)

export const Pin = (p) => (
  <Icon {...p}>
    <path d="M12 17v5" />
    <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
  </Icon>
)

export const Eye = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const Brain = (p) => (
  <Icon {...p}>
    <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.6A3 3 0 0 0 4.5 8a3 3 0 0 0 .4 1.5A3 3 0 0 0 4 12a3 3 0 0 0 1.2 2.4A3 3 0 0 0 5 16a3 3 0 0 0 3 3 2.5 2.5 0 0 0 4 0V4.5A2.5 2.5 0 0 0 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.6A3 3 0 0 1 19.5 8a3 3 0 0 1-.4 1.5A3 3 0 0 1 20 12a3 3 0 0 1-1.2 2.4A3 3 0 0 1 19 16a3 3 0 0 1-3 3" />
  </Icon>
)

export const Code = (p) => (
  <Icon {...p}>
    <path d="m9 18-6-6 6-6" />
    <path d="m15 6 6 6-6 6" />
  </Icon>
)

export const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m21 16-5-5L5 20" />
  </Icon>
)

export const Sparkle = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M18 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
  </Icon>
)

export const Bulb = (p) => (
  <Icon {...p}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
  </Icon>
)

export const Chart = (p) => (
  <Icon {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15v3M12 10v8M17 6v12" />
  </Icon>
)

export const Edit = (p) => (
  <Icon {...p}>
    <path d="M4 20h4l10.5-10.5a2.83 2.83 0 0 0-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)

export const Cpu = (p) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
  </Icon>
)

export const HardDrive = (p) => (
  <Icon {...p}>
    <path d="M3 13h18" />
    <path d="M5 13 7 5h10l2 8v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6Z" />
    <path d="M8 17h.01M12 17h.01" />
  </Icon>
)

export const Info = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
)

export const Warning = (p) => (
  <Icon {...p}>
    <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
)

export const Plus = (p) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const Play = ({ size = 18, ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
)

export const Terminal = (p) => (
  <Icon {...p}>
    <path d="m5 8 4 4-4 4" />
    <path d="M13 16h6" />
    <rect x="2" y="3" width="20" height="18" rx="2" />
  </Icon>
)

export const Globe = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </Icon>
)

export const Bolt = (p) => (
  <Icon {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </Icon>
)

export const Layers = (p) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
)

export const Sun = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const Moon = (p) => (
  <Icon {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Icon>
)

export const Folder = (p) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Icon>
)

export const File = (p) => (
  <Icon {...p}>
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
    <path d="M14 2v5h5" />
  </Icon>
)

export const ICONS_BY_NAME = {
  sparkle: Sparkle,
  code: Code,
  image: ImageIcon,
  edit: Edit,
  bulb: Bulb,
  chart: Chart,
}
