import type { Flags } from './flags'

export type Answers = {
  intent?: 'single' | 'multiple' | 'buy'
  propertyType?: 'home' | 'room' | 'timeshare' | 'other'
  bedrooms: number
  location: string // control: "address or zip code"; variant: ZIP only
  street: string // variant: collected on the estimate screen
  renting?: 'yes' | 'no'
  manages?: 'self' | 'manager'
  furnished?: 'furnished' | 'unfurnished'
  stayType?: 'nightly' | 'monthly' | 'annual'
  timing?: 'asap' | '90' | '6mo' | 'none'
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  contactPref?: 'call' | 'text' | 'email'
}

export const EMPTY: Answers = {
  bedrooms: 1,
  location: '',
  street: '',
  firstName: '',
  lastName: '',
  fullName: '',
  email: '',
  phone: '',
}

export type StepId =
  | 'intent'
  | 'otherPath'
  | 'propertyType'
  | 'bedrooms'
  | 'location'
  | 'renting'
  | 'manages'
  | 'furnished'
  | 'stayType'
  | 'timing'
  | 'estimate'
  | 'contact'
  | 'notAFit'
  | 'done'

// The path depends on earlier answers, as in Evolve's current flow.
export function stepsFor(a: Answers, flags: Flags): StepId[] {
  if (a.intent && a.intent !== 'single') return ['intent', 'otherPath']
  if (a.propertyType === 'other') return ['intent', 'propertyType', 'notAFit']
  const steps: StepId[] = ['intent', 'propertyType', 'bedrooms', 'location', 'renting']
  if (a.renting === 'yes') steps.push('manages')
  steps.push('furnished')
  if (a.furnished === 'unfurnished') steps.push('stayType')
  if (a.stayType === 'annual' && a.furnished === 'unfurnished') return [...steps, 'notAFit']
  steps.push('timing')
  if (flags.estimateScreen) steps.push('estimate')
  steps.push('contact', 'done')
  return steps
}

export type OwnerType = 'switcher' | 'selfManager' | 'firstTime'

export function ownerType(a: Answers): OwnerType {
  if (a.renting === 'yes') return a.manages === 'manager' ? 'switcher' : 'selfManager'
  return 'firstTime'
}

// Reassurance the current flow already shows, matched to the owner.
export const OWNER_COPY: Record<OwnerType, { title: string; body: string }> = {
  firstTime: {
    title: 'Over half of our new owners are first-time hosts.',
    body: 'We guide each one through every step, from photos to your first guest.',
  },
  selfManager: {
    title: 'Keep control, lose the busywork.',
    body: 'We take on pricing, listings and guest messages around the clock. You decide how hands-on to be.',
  },
  switcher: {
    title: 'Over 1,100 owners left another manager for Evolve this year.',
    body: 'Looking for better results without giving up control. No long-term contract.',
  },
}

// Photo-banner value points, as in the current flow (one per step).
export const BANNERS: Partial<Record<StepId, { text: string; tone: string }>> = {
  intent: { text: 'Industry-low fees starting at 10%', tone: 'a' },
  propertyType: { text: 'Owners earn up to 18% more than the market', tone: 'b' },
  bedrooms: { text: 'Listed everywhere guests are looking', tone: 'c' },
  location: { text: '$1M liability coverage on every booking', tone: 'd' },
  renting: { text: 'Use your own cleaner or our vetted partners', tone: 'a' },
  manages: { text: 'Use your own cleaner or our vetted partners', tone: 'a' },
  furnished: { text: '4.8★ average guest reviews', tone: 'b' },
  stayType: { text: '4.8★ average guest reviews', tone: 'b' },
  timing: { text: 'Welcome your first guest faster', tone: 'c' },
  estimate: { text: 'Priced with SmartRates and local experts', tone: 'b' },
  contact: { text: 'No long-term contract required', tone: 'd' },
  done: { text: 'Welcome to Evolve', tone: 'c' },
}
