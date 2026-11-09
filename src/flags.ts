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
    note: 'Makes going back visible. The answers list above each question stays as it is today.',
  },
  whyCopy: {
    label: 'Say why we ask',
    plan: 'Test 1',
    note: "Uses Evolve's own reason on the address step.",
  },
  contactRework: {
    label: 'Contact step rework',
    plan: 'Test 2',
    note: 'One line on what happens next, above the fields; one full-name field; a plain button.',
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
