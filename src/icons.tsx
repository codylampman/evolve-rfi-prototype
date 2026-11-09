// Simple line icons in the style of Evolve's current choice cards.
type P = { size?: number }
const base = (size = 28) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconHouse = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10v9h12v-9" />
    <path d="M10 19v-5h4v5" />
  </svg>
)
export const IconHomes = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 12 8 8l5 4" />
    <path d="M4.5 11v8h7" />
    <path d="M11 9.5 16 5.5l5 4" />
    <path d="M12.5 8.5V19h7V8.5" />
    <path d="M15 19v-3h2v3" />
  </svg>
)
export const IconAFrame = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 4 4 20h16L12 4Z" />
    <path d="M10 20v-4h4v4" />
    <path d="M9.5 13h5" />
  </svg>
)
export const IconDoor = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M7 20V4h10v16" />
    <path d="M4 20h16" />
    <circle cx="14" cy="12.5" r="0.6" fill="currentColor" />
  </svg>
)
export const IconCalendar = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
    <path d="M4.5 10h15M9 3.5v4M15 3.5v4" />
  </svg>
)
export const IconTent = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 5 3.5 19h17L12 5Z" />
    <path d="M12 12l-3.5 7M12 12l3.5 7" />
  </svg>
)
export const IconCheck = ({ size = 22 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.3 4.6-5" />
  </svg>
)
export const IconPencil = ({ size = 22 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <path d="M15.5 5.5 18.5 8.5 9 18H6v-3l9.5-9.5Z" />
    <path d="M13.5 7.5l3 3" />
  </svg>
)
export const IconPin = ({ size = 22 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <path d="M12 21s-6-5.6-6-10.5a6 6 0 1 1 12 0C18 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.2" />
  </svg>
)
