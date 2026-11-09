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

// Evolve's current reassurance copy, matched to the owner (word for word
// from the live flow's furnished step).
export const OWNER_COPY: Record<OwnerType, { title: string; body: string }> = {
  firstTime: {
    title: 'Over half of our new owners are first-time hosts,',
    body: 'and we guide each one through every step.',
  },
  selfManager: {
    title: 'Nearly 2,000 self-managing owners joined Evolve this year',
    body: 'to earn more without it becoming a second job.',
  },
  switcher: {
    title: 'Over 1,100 owners left another manager for Evolve this year,',
    body: 'looking for better results without giving up control.',
  },
}

// Photo-banner value points, as in the current flow (one per step).
export const BANNERS: Partial<Record<StepId, { text: string; tone: string }>> = {
  intent: { text: 'Industry-low fees starting at 10%', tone: 'a' },
  propertyType: { text: 'Owners earn up to 18% more than the market', tone: 'b' },
  bedrooms: { text: 'Listed everywhere guests are looking', tone: 'c' },
  location: { text: '$1M liability coverage on every booking', tone: 'd' },
  renting: { text: 'Smarter pricing for more bookings', tone: 'a' },
  manages: { text: 'Use your own cleaner or our vetted partners', tone: 'a' },
  furnished: { text: '4.8★ average guest reviews', tone: 'b' },
  stayType: { text: '4.8★ average guest reviews', tone: 'b' },
  timing: { text: 'Welcome your first guest faster', tone: 'c' },
  estimate: { text: 'Priced with SmartRates and local experts', tone: 'b' },
  contact: { text: 'No long-term contract required', tone: 'd' },
  done: { text: 'Welcome to Evolve', tone: 'c' },
}

// Question titles and answer labels for the "Edit answers" list.
export const TITLES: Partial<Record<StepId, string>> = {
  intent: 'How would you like to get started with Evolve?',
  propertyType: 'Which of these best describes your property?',
  bedrooms: 'How many bedrooms does your property have?',
  location: "What's the address?",
  renting: 'Are you currently renting it out as a vacation rental?',
  manages: 'How do you manage it?',
  furnished: 'Will you be renting out your property furnished or unfurnished?',
  stayType: 'What are you most interested in?',
  timing: 'How soon would you like to get started?',
  estimate: 'Street address',
}

const LABELS: Record<string, string> = {
  single: 'Looking to rent out my property',
  multiple: 'Looking to rent multiple properties',
  buy: 'Looking to buy a property',
  home: 'A whole home or condo',
  room: 'A private room',
  timeshare: 'A timeshare',
  other: 'Something else',
  yes: 'Yes',
  no: 'No',
  self: 'I manage it myself',
  manager: 'I use a property manager',
  furnished: 'Furnished',
  unfurnished: 'Unfurnished',
  nightly: 'Nightly and weekly stays',
  monthly: 'Monthly stays (28+ days)',
  annual: 'Annual lease (12+ months)',
  asap: 'As soon as possible',
  '90': 'Within 90 days',
  '6mo': 'Within the next 6 months',
  none: 'No firm timeframe',
}

export function answerLabel(id: StepId, a: Answers): string {
  const raw: Partial<Record<StepId, string | number | undefined>> = {
    intent: a.intent,
    propertyType: a.propertyType,
    bedrooms: a.bedrooms,
    location: a.location,
    renting: a.renting,
    manages: a.manages,
    furnished: a.furnished,
    stayType: a.stayType,
    timing: a.timing,
    estimate: a.street,
  }
  const v = raw[id]
  if (v === undefined || v === '') return ''
  return LABELS[String(v)] ?? String(v)
}
