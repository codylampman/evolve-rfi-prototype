// Feature flags. Each flag is one change from the test plan, so any change
// can be seen on its own against the current flow ("control").
// Set them with the Flags panel or the URL, e.g. ?flags=backButton,whyCopy

export type FlagKey =
  | 'backButton'
  | 'whyCopy'
  | 'contactRework'
  | 'estimateScreen'
  | 'requirePhone'

export type Flags = Record<FlagKey, boolean>

export const FLAG_INFO: Record<FlagKey, { label: string; plan: string; note: string }> = {
  backButton: {
    label: 'Visible back button',
    plan: 'Just do it',
    note: 'Replaces the hidden swipe-down to edit earlier answers.',
  },
  whyCopy: {
    label: 'Say why we ask',
    plan: 'Test 1',
    note: "Uses Evolve's own reasons for the address and phone fields.",
  },
  contactRework: {
    label: 'Contact step rework',
    plan: 'Test 2',
    note: 'Full name, what happens next, contact preference, a button that names the reward, reassurance matched to the owner.',
  },
  estimateScreen: {
    label: 'ZIP first + earnings estimate',
    plan: 'Test 3',
    note: 'Ask for ZIP early, show an honest earnings range before contact, collect the street address there.',
  },
  requirePhone: {
    label: 'Phone required',
    plan: 'Config',
    note: 'Open question for sales. On by default to protect lead quality.',
  },
}

export const CONTROL: Flags = {
  backButton: false,
  whyCopy: false,
  contactRework: false,
  estimateScreen: false,
  requirePhone: true,
}

export const PROPOSED: Flags = {
  backButton: true,
  whyCopy: true,
  contactRework: true,
  estimateScreen: true,
  requirePhone: true,
}

const KEYS = Object.keys(CONTROL) as FlagKey[]

export function flagsFromUrl(): Flags {
  const params = new URLSearchParams(window.location.search)
  const preset = params.get('preset')
  if (preset === 'control') return { ...CONTROL }
  const list = params.get('flags')
  if (list === null) return { ...PROPOSED }
  const on = new Set(list.split(',').filter(Boolean))
  const flags = { ...CONTROL }
  for (const k of KEYS) flags[k] = on.has(k) || (k === 'requirePhone' && !on.has('phoneOptional'))
  return flags
}

export function flagsToUrl(flags: Flags) {
  const on: string[] = KEYS.filter((k) => k !== 'requirePhone' && flags[k])
  if (!flags.requirePhone) on.push('phoneOptional')
  const url = new URL(window.location.href)
  url.searchParams.delete('preset')
  url.searchParams.set('flags', on.join(','))
  window.history.replaceState(null, '', url)
}
