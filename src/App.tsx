import { useEffect, useMemo, useRef, useState } from 'react'
import { CONTROL, FLAG_INFO, PROPOSED, flagsFromUrl, flagsToUrl, type FlagKey, type Flags } from './flags'
import { BANNERS, EMPTY, OWNER_COPY, ownerType, stepsFor, type Answers, type StepId } from './flow'
import { estimateRange, money } from './estimate'
import { subscribe, track, type RfiEvent } from './events'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneDigits = (p: string) => p.replace(/\D/g, '')

export default function App() {
  const [flags, setFlags] = useState<Flags>(flagsFromUrl)
  const [answers, setAnswers] = useState<Answers>(EMPTY)
  const [history, setHistory] = useState<StepId[]>(['intent'])
  const current = history[history.length - 1]
  const steps = useMemo(() => stepsFor(answers, flags), [answers, flags])

  useEffect(() => {
    track('step_viewed', current)
    window.scrollTo(0, 0)
  }, [current])

  const update = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }))

  // Move to the step after `from`, using the answers just given.
  const next = (from: StepId, patch: Partial<Answers> = {}) => {
    const merged = { ...answers, ...patch }
    setAnswers(merged)
    track('step_completed', from)
    const path = stepsFor(merged, flags)
    const nextStep = path[path.indexOf(from) + 1]
    if (nextStep === 'notAFit') track('not_a_fit', from)
    if (nextStep) setHistory((h) => [...h, nextStep])
  }

  const back = () => {
    if (history.length < 2) return
    track('step_back', current)
    setHistory((h) => h.slice(0, -1))
  }

  const restart = () => {
    setAnswers(EMPTY)
    setHistory(['intent'])
  }

  const changeFlags = (f: Flags) => {
    setFlags(f)
    flagsToUrl(f)
    restart()
  }

  // Progress only counts the main path, so it moves forward steadily.
  const pathSteps: StepId[] = steps.filter((s) => s !== 'done' && s !== 'notAFit' && s !== 'otherPath')
  const pos = Math.max(pathSteps.indexOf(current), 0)
  const progress = current === 'done' ? 1 : pos / Math.max(pathSteps.length, 1)

  const banner = BANNERS[current]
  const canGoBack = flags.backButton && history.length > 1 && current !== 'done'

  return (
    <div className="page">
      <div className="phone">
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.max(progress, 0.04) * 100}%` }} />
        </div>
        <header className="topbar">
          {canGoBack ? (
            <button className="back" onClick={back} aria-label="Back">
              <span aria-hidden="true">‹</span> Back
            </button>
          ) : (
            <span className="wordmark">evolve</span>
          )}
          <FlagsPanel flags={flags} onChange={changeFlags} />
        </header>
        {banner && (
          <div className={`banner tone-${banner.tone}`}>
            <span className="chip">{banner.text}</span>
          </div>
        )}
        <main className="card">
          <Step
            id={current}
            a={answers}
            flags={flags}
            update={update}
            next={next}
            restart={restart}
            back={back}
          />
        </main>
        <footer className="footnote">Prototype for an Evolve case study by Cody Lampman. Estimates are demo numbers.</footer>
      </div>
    </div>
  )
}

type StepProps = {
  id: StepId
  a: Answers
  flags: Flags
  update: (p: Partial<Answers>) => void
  next: (from: StepId, patch?: Partial<Answers>) => void
  restart: () => void
  back: () => void
}

function Step({ id, a, flags, update, next, restart, back }: StepProps) {
  switch (id) {
    case 'intent':
      return (
        <Question title="How would you like to get started with Evolve?">
          <Choices
            options={[
              ['single', 'Looking to rent out my property'],
              ['multiple', 'Looking to rent multiple properties'],
              ['buy', 'Looking to buy a property'],
            ]}
            value={a.intent}
            onPick={(v) => next('intent', { intent: v as Answers['intent'] })}
          />
        </Question>
      )

    case 'otherPath':
      return (
        <Question title="This prototype covers the single-property path">
          <p className="body">
            The multiple-property and buying paths are unchanged here. They share the same contact step, so the
            contact changes would carry over to them.
          </p>
          <button className="primary" onClick={back}>
            Go back
          </button>
        </Question>
      )

    case 'propertyType':
      return (
        <Question title="Which of these best describes your property?">
          <Choices
            options={[
              ['home', 'A whole home or condo', 'house, cabin, townhouse, studio, tiny home, etc.'],
              ['room', 'A private room'],
              ['timeshare', 'A timeshare'],
              ['other', 'Something else', 'tent, houseboat, or movable camper'],
            ]}
            value={a.propertyType}
            onPick={(v) => next('propertyType', { propertyType: v as Answers['propertyType'] })}
          />
        </Question>
      )

    case 'bedrooms':
      return (
        <Question title="How many bedrooms does your property have?" note="Over 30,000 owners trust Evolve to rent out homes like yours.">
          <div className="stepper">
            <button aria-label="Fewer bedrooms" onClick={() => update({ bedrooms: Math.max(1, a.bedrooms - 1) })}>
              −
            </button>
            <output aria-live="polite">{a.bedrooms}</output>
            <button aria-label="More bedrooms" onClick={() => update({ bedrooms: Math.min(20, a.bedrooms + 1) })}>
              +
            </button>
          </div>
          <button className="primary" onClick={() => next('bedrooms')}>
            Next
          </button>
        </Question>
      )

    case 'location':
      return <LocationStep a={a} flags={flags} next={next} />

    case 'renting':
      return (
        <Question title="Are you currently renting it out as a vacation rental?">
          <Choices
            options={[
              ['yes', 'Yes'],
              ['no', 'No'],
            ]}
            value={a.renting}
            onPick={(v) => next('renting', { renting: v as Answers['renting'], manages: undefined })}
          />
        </Question>
      )

    case 'manages':
      return (
        <Question title="How do you manage it?">
          <Choices
            options={[
              ['self', 'I manage it myself'],
              ['manager', 'I use a property manager'],
            ]}
            value={a.manages}
            onPick={(v) => next('manages', { manages: v as Answers['manages'] })}
          />
        </Question>
      )

    case 'furnished':
      return (
        <Question
          title="Will you be renting out your property furnished or unfurnished?"
          note="Over half of our new owners are first-time hosts, and we guide each one through every step."
        >
          <Choices
            options={[
              ['furnished', 'Furnished'],
              ['unfurnished', 'Unfurnished'],
            ]}
            value={a.furnished}
            onPick={(v) => next('furnished', { furnished: v as Answers['furnished'], stayType: undefined })}
          />
        </Question>
      )

    case 'stayType':
      return (
        <Question title="What are you most interested in?">
          <Choices
            options={[
              ['nightly', 'Nightly and weekly stays'],
              ['monthly', 'Monthly stays (28+ days)'],
              ['annual', 'Annual lease (12+ months)'],
            ]}
            value={a.stayType}
            onPick={(v) => next('stayType', { stayType: v as Answers['stayType'] })}
          />
        </Question>
      )

    case 'timing':
      return (
        <Question title="How soon would you like to get started?">
          <Choices
            options={[
              ['asap', 'As soon as possible'],
              ['90', 'Within 90 days'],
              ['6mo', 'Within the next 6 months'],
              ['none', 'No firm timeframe'],
            ]}
            value={a.timing}
            onPick={(v) => next('timing', { timing: v as Answers['timing'] })}
          />
        </Question>
      )

    case 'estimate':
      return <EstimateStep a={a} flags={flags} next={next} />

    case 'contact':
      return flags.contactRework ? (
        <ContactReworked a={a} flags={flags} next={next} />
      ) : (
        <ContactControl a={a} flags={flags} next={next} />
      )

    case 'notAFit':
      return (
        <Question title="Thanks for checking. This one isn't a fit for us yet.">
          <p className="body">
            {a.propertyType === 'other'
              ? "We aren't able to manage tents, houseboats or campers right now."
              : 'Evolve focuses on nightly, weekly and monthly stays, so annual leases are outside what we manage.'}{' '}
            If anything changes, we'd love to hear from you.
          </p>
          <button className="secondary" onClick={restart}>
            Start over
          </button>
        </Question>
      )

    case 'done': {
      const first = (a.fullName.trim().split(/\s+/)[0] || a.firstName || '').trim()
      return (
        <Question title={`You're all set${first ? `, ${first}` : ''}.`}>
          <ol className="next-steps">
            <li>We review your home and the market around it.</li>
            <li>
              A local expert reaches out by {a.contactPref ?? 'phone'} to walk you through your
              {flags.estimateScreen ? ' full' : ''} estimate.
            </li>
            <li>You decide. There's no long-term contract.</li>
          </ol>
          <button className="secondary" onClick={restart}>
            Start over
          </button>
        </Question>
      )
    }
  }
}

function LocationStep({ a, flags, next }: Pick<StepProps, 'a' | 'flags' | 'next'>) {
  const zipOnly = flags.estimateScreen
  const [value, setValue] = useState(a.location)
  const [error, setError] = useState('')
  const submit = () => {
    const ok = zipOnly ? /^\d{5}$/.test(value.trim()) : value.trim().length >= 5
    if (!ok) {
      setError(zipOnly ? 'Enter a 5-digit ZIP code.' : 'Enter an address or ZIP code.')
      track('field_error', 'location')
      return
    }
    next('location', { location: value.trim() })
  }
  return (
    <Question title={zipOnly ? 'Where is your home?' : 'Where is it located?'}>
      <Field
        label={zipOnly ? 'ZIP code' : 'Address or zip code'}
        help={
          flags.whyCopy
            ? zipOnly
              ? 'We use this to estimate what homes like yours earn nearby.'
              : 'We use your address to look up your home and estimate what it could earn.'
            : undefined
        }
        error={error}
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          onFocus={() => track('field_focus', 'location')}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          inputMode={zipOnly ? 'numeric' : 'text'}
          autoComplete={zipOnly ? 'postal-code' : 'street-address'}
          maxLength={zipOnly ? 5 : 120}
          placeholder={zipOnly ? '84115' : ''}
        />
      </Field>
      <button className="primary" onClick={submit}>
        Next
      </button>
    </Question>
  )
}

function EstimateStep({ a, flags, next }: Pick<StepProps, 'a' | 'flags' | 'next'>) {
  const [lo, hi] = estimateRange(a.bedrooms, a.location, a.stayType)
  const [street, setStreet] = useState(a.street)
  const [error, setError] = useState('')
  const beds = `${a.bedrooms}-bedroom ${a.propertyType === 'room' ? 'rooms' : 'homes'}`
  const submit = () => {
    if (street.trim().length < 5) {
      setError('Add your street address to continue.')
      track('field_error', 'estimate', 'street')
      return
    }
    next('estimate', { street: street.trim() })
  }
  return (
    <Question title="Here's what homes like yours earn">
      <div className="estimate" role="status">
        <span className="estimate-range">
          {money(lo)} to {money(hi)}
        </span>
        <span className="estimate-unit">a year in rental income</span>
        <span className="estimate-basis">
          Based on {beds} near {a.location}
          {a.stayType === 'monthly' ? ' with monthly stays' : ''}. Your local expert will refine it.
        </span>
      </div>
      <p className="proof">Owners with Evolve earn up to 18% more than the market average.</p>
      <Field
        label="Street address"
        help={flags.whyCopy ? 'For a sharper estimate. We use it to look up your home, nothing else.' : undefined}
        error={error}
      >
        <input
          value={street}
          onChange={(e) => {
            setStreet(e.target.value)
            setError('')
          }}
          onFocus={() => track('field_focus', 'estimate', 'street')}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoComplete="street-address"
          placeholder="2030 S 300 E"
        />
      </Field>
      <button className="primary" onClick={submit}>
        Continue
      </button>
    </Question>
  )
}

function ContactControl({ a, flags, next }: Pick<StepProps, 'a' | 'flags' | 'next'>) {
  const [f, setF] = useState({ first: a.firstName, last: a.lastName, email: a.email, phone: a.phone })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.first.trim()) e.first = 'Enter your first name.'
    if (!f.last.trim()) e.last = 'Enter your last name.'
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email.'
    if (flags.requirePhone || f.phone) if (phoneDigits(f.phone).length < 10) e.phone = 'Enter a 10-digit phone number.'
    setErrors(e)
    if (Object.keys(e).length) return Object.keys(e).forEach((k) => track('field_error', 'contact', k))
    track('rfi_submitted', 'contact')
    next('contact', { firstName: f.first, lastName: f.last, email: f.email, phone: f.phone })
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Question title="Great! Let's see if we're a fit">
      <Field label="First name" error={errors.first}>
        <input value={f.first} onChange={set('first')} autoComplete="given-name" onFocus={() => track('field_focus', 'contact', 'first')} />
      </Field>
      <Field label="Last name" error={errors.last}>
        <input value={f.last} onChange={set('last')} autoComplete="family-name" onFocus={() => track('field_focus', 'contact', 'last')} />
      </Field>
      <Field label="Email" error={errors.email} help={flags.whyCopy ? "We'll send next steps here." : undefined}>
        <input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" onFocus={() => track('field_focus', 'contact', 'email')} />
      </Field>
      <Field
        label={flags.requirePhone ? 'Phone' : 'Phone (optional)'}
        error={errors.phone}
        help={flags.whyCopy ? 'A local expert will reach out to walk you through your options.' : undefined}
      >
        <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(XXX) XXX-XXXX" onFocus={() => track('field_focus', 'contact', 'phone')} />
      </Field>
      <button className="primary" onClick={submit}>
        Complete
      </button>
      <div className="note">
        <strong>You could be live in as little as a week.</strong> We'll handle the photos, listing, and pricing to get
        you there.
      </div>
      <p className="fine">
        By providing your contact information and clicking "Complete", you agree to be contacted by Evolve via email,
        calls, and texts. You also agree to Evolve's Terms of Use and Privacy Policy. Giving this consent is not a
        condition of purchase. Message and data rates may apply.
      </p>
    </Question>
  )
}

function ContactReworked({ a, flags, next }: Pick<StepProps, 'a' | 'flags' | 'next'>) {
  const [f, setF] = useState({ name: a.fullName, email: a.email, phone: a.phone })
  const [pref, setPref] = useState<Answers['contactPref']>(a.contactPref ?? 'call')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const owner = OWNER_COPY[ownerType(a)]
  const cta = flags.estimateScreen ? 'Get my full estimate' : 'Get my free estimate'
  const submit = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Enter your name.'
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email.'
    if (flags.requirePhone || f.phone) if (phoneDigits(f.phone).length < 10) e.phone = 'Enter a 10-digit phone number.'
    setErrors(e)
    if (Object.keys(e).length) return Object.keys(e).forEach((k) => track('field_error', 'contact', k))
    track('rfi_submitted', 'contact', pref)
    next('contact', { fullName: f.name, email: f.email, phone: f.phone, contactPref: pref })
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Question title={flags.estimateScreen ? 'Where should we send your full estimate?' : 'Get your free estimate from a local expert'}>
      <div className="note">
        <strong>{owner.title}</strong> {owner.body}
      </div>
      <Field label="Full name" error={errors.name}>
        <input value={f.name} onChange={set('name')} autoComplete="name" onFocus={() => track('field_focus', 'contact', 'name')} />
      </Field>
      <Field label="Email" error={errors.email} help={flags.whyCopy ? "We'll send your estimate and next steps here." : undefined}>
        <input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" onFocus={() => track('field_focus', 'contact', 'email')} />
      </Field>
      <Field
        label={flags.requirePhone ? 'Phone' : 'Phone (optional)'}
        error={errors.phone}
        help={flags.whyCopy ? 'A local expert will reach out to walk you through your estimate. No pressure.' : undefined}
      >
        <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(801) 555-0123" onFocus={() => track('field_focus', 'contact', 'phone')} />
      </Field>
      <fieldset className="prefs">
        <legend>How should we reach you first?</legend>
        {(['call', 'text', 'email'] as const).map((p) => (
          <button key={p} type="button" className={`pill ${pref === p ? 'on' : ''}`} aria-pressed={pref === p} onClick={() => setPref(p)}>
            {p === 'call' ? 'Call me' : p === 'text' ? 'Text me' : 'Email me'}
          </button>
        ))}
      </fieldset>
      <button className="primary" onClick={submit}>
        {cta}
      </button>
      <div className="what-next">
        <span className="what-next-title">What happens next</span>
        <ol>
          <li>We review your home and the market around it.</li>
          <li>A local expert walks you through your estimate.</li>
          <li>You decide. No long-term contract.</li>
        </ol>
      </div>
      <p className="fine">
        By tapping "{cta}", you agree Evolve may contact you about your home by email, phone or text, and to our Terms
        and Privacy Policy. Consent isn't required to buy. Message and data rates may apply.
      </p>
    </Question>
  )
}

function Question({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [title])
  return (
    <section className="question">
      {note && <div className="note">{note}</div>}
      <h1 tabIndex={-1} ref={ref}>
        {title}
      </h1>
      {children}
    </section>
  )
}

function Choices({ options, value, onPick }: { options: [string, string, string?][]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="choices">
      {options.map(([v, label, sub]) => (
        <button key={v} className={`choice ${value === v ? 'on' : ''}`} onClick={() => onPick(v)}>
          <span className="choice-label">{label}</span>
          {sub && <span className="choice-sub">{sub}</span>}
        </button>
      ))}
    </div>
  )
}

function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : help && <span className="field-help">{help}</span>}
    </label>
  )
}

function FlagsPanel({ flags, onChange }: { flags: Flags; onChange: (f: Flags) => void }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<RfiEvent[]>([])
  useEffect(() => subscribe(setEvents), [])
  const preset = JSON.stringify(flags) === JSON.stringify(CONTROL) ? 'control' : JSON.stringify(flags) === JSON.stringify(PROPOSED) ? 'proposed' : 'custom'
  return (
    <>
      <button className="flags-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Flags · {preset === 'control' ? 'Control' : preset === 'proposed' ? 'Proposed' : 'Custom'}
      </button>
      {open && (
        <aside className="flags" aria-label="Feature flags">
          <div className="flags-head">
            <strong>Feature flags</strong>
            <button className="link" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="flags-intro">Each flag is one change from the test plan. Switching restarts the flow.</p>
          <div className="presets">
            <button className={`pill ${preset === 'control' ? 'on' : ''}`} onClick={() => onChange({ ...CONTROL })}>
              Control (today)
            </button>
            <button className={`pill ${preset === 'proposed' ? 'on' : ''}`} onClick={() => onChange({ ...PROPOSED })}>
              Proposed (all on)
            </button>
          </div>
          {(Object.keys(FLAG_INFO) as FlagKey[]).map((k) => (
            <label key={k} className="flag">
              <input type="checkbox" checked={flags[k]} onChange={(e) => onChange({ ...flags, [k]: e.target.checked })} />
              <span>
                <span className="flag-label">
                  {FLAG_INFO[k].label} <em>{FLAG_INFO[k].plan}</em>
                </span>
                <span className="flag-note">{FLAG_INFO[k].note}</span>
              </span>
            </label>
          ))}
          <div className="events">
            <strong>Event log</strong>
            <ul>
              {events.slice(-8).reverse().map((e, i) => (
                <li key={i}>
                  <code>{e.name}</code> {e.step} {e.detail && <span>· {e.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </>
  )
}
