import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CONTROL, FLAG_INFO, PROPOSED, flagsFromUrl, flagsToUrl, type FlagKey, type Flags } from './flags'
import { BANNERS, EMPTY, OWNER_COPY, TITLES, answerLabel, ownerType, stepsFor, type Answers, type StepId } from './flow'
import { estimateRange, money } from './estimate'
import { subscribe, track, type RfiEvent } from './events'
import QRCode from 'qrcode'
import { IconAFrame, IconCalendar, IconCheck, IconDoor, IconHomes, IconHouse, IconPencil, IconPin, IconTent } from './icons'
import logoUrl from './assets/evolve-logo.png'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneDigits = (p: string) => p.replace(/\D/g, '')

export default function App() {
  const [flags, setFlags] = useState<Flags>(flagsFromUrl)
  const [answers, setAnswers] = useState<Answers>(EMPTY)
  const [history, setHistory] = useState<StepId[]>(['intent'])
  const current = history[history.length - 1]
  const steps = useMemo(() => stepsFor(answers, flags), [answers, flags])

  const phoneRef = useRef<HTMLDivElement>(null)
  const [sheet, setSheet] = useState<null | 'flags'>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  // Like today's flow: earlier answers sit above the current question,
  // out of view until the owner scrolls up or picks "Edit answers".
  const scrollTo = (el: HTMLElement | null) => {
    if (!el) return
    const st = stickyRef.current
    // Measure the visible pinned area, including the photo's overlap.
    const pinned = st ? Math.max(st.getBoundingClientRect().height, st.scrollHeight) : 0
    el.style.scrollMarginTop = `${pinned + 4}px`
    el.scrollIntoView({ block: 'start' })
  }
  // Log the starting version once, the way a live test logs each owner's assignment.
  const assigned = useRef(false)
  useEffect(() => {
    if (assigned.current) return
    assigned.current = true
    for (const k of Object.keys(flags) as FlagKey[]) track('flag_set', k, flags[k] ? 'on' : 'off')
  }, [flags])
  // Only add as much space below the content as it takes to bring the
  // current question to the top (usually none on the longer final screens).
  // Measured and scrolled in one step, before the screen paints.
  const spacerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const phone = phoneRef.current
    const spacerEl = spacerRef.current
    if (!phone || !spacerEl) return
    const inFrame = getComputedStyle(phone).overflowY === 'auto'
    const viewH = inFrame ? phone.clientHeight : window.innerHeight
    const sticky = stickyRef.current ? Math.max(stickyRef.current.getBoundingClientRect().height, stickyRef.current.scrollHeight) : 0
    const below = currentRef.current?.offsetHeight ?? 0
    if (history.length < 2) {
      spacerEl.style.height = '0px'
      phone.scrollTo(0, 0)
      window.scrollTo(0, 0)
      return
    }
    spacerEl.style.height = `${Math.max(0, viewH - sticky - below)}px`
    scrollTo(currentRef.current)
    // Settle once more after fonts and images finish laying out.
    const id = requestAnimationFrame(() => scrollTo(currentRef.current))
    return () => cancelAnimationFrame(id)
  }, [current, history.length])
  useEffect(() => {
    track('step_viewed', current)
  }, [current])
  const editAnswers = () => scrollTo(stackRef.current)

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

  // Flags apply in place. Only a step the new flags remove (the estimate
  // screen) drops out of the history, so the owner lands on the step before it.
  const changeFlags = (f: Flags) => {
    for (const k of Object.keys(f) as FlagKey[]) if (f[k] !== flags[k]) track('flag_set', k, f[k] ? 'on' : 'off')
    setFlags(f)
    flagsToUrl(f)
    const valid = stepsFor(answers, f)
    setHistory((h) => {
      const kept = h.filter((id) => valid.includes(id))
      return kept.length ? kept : ['intent']
    })
  }

  // Progress only counts the main path, so it moves forward steadily.
  const pathSteps: StepId[] = steps.filter((s) => s !== 'done' && s !== 'notAFit' && s !== 'otherPath')
  const pos = Math.max(pathSteps.indexOf(current), 0)
  const progress = current === 'done' ? 1 : pos / Math.max(pathSteps.length, 1)

  const banner = BANNERS[current]
  const canGoBack = flags.backButton && history.length > 1 && current !== 'done'
  const answered = history.filter((id) => id !== current && TITLES[id])

  return (
    <div className="page">
      <DesktopNotes />
      <div className="device-col">
      <div className="device">
      <div className="phone" ref={phoneRef}>
        <div className="sticky-top" ref={stickyRef}>
        <div className="statusbar desktop-only" aria-hidden="true">
          <span>9:41</span>
          <span className="status-icons">
            <i className="sig" />
            <i className="wifi" />
            <i className="batt" />
          </span>
        </div>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.max(progress, 0.04) * 100}%` }} />
        </div>
        <header className="topbar">
          <img className="logo" src={logoUrl} alt="Evolve" width={130} height={27} />
          <Menu
            canEdit={answered.length > 0}
            onEdit={editAnswers}
            onRestart={restart}
            onFlags={() => setSheet('flags')}
          />
        </header>
        {banner && (
          <div className={`banner tone-${banner.tone}`}>
            <span className="chip">{banner.text}</span>
          </div>
        )}
        </div>
        <main className="card">
          {answered.length > 0 && (
            <div className="answered" ref={stackRef} aria-label="Your answers">
              {answered.map((id) => (
                <div className="answered-item" key={id}>
                  <div>
                    <span className="answer-q">{id === 'location' && flags.estimateScreen ? 'ZIP code' : TITLES[id]}</span>
                    <span className="answer-a">{answerLabel(id, answers)}</span>
                  </div>
                  <button
                    className="edit"
                    aria-label={`Edit: ${TITLES[id]}`}
                    onClick={() => {
                      track('step_edit', id)
                      setHistory((h) => h.slice(0, h.indexOf(id) + 1))
                    }}
                  >
                    <IconPencil />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="current" ref={currentRef}>
          {canGoBack && (
            <button className="back-link" onClick={back}>
              <span aria-hidden="true">‹</span> Back
            </button>
          )}
          <Step
            id={current}
            a={answers}
            flags={flags}
            update={update}
            next={next}
            restart={restart}
            back={back}
            editAnswers={editAnswers}
          />
          </div>
        </main>
        <div aria-hidden="true" ref={spacerRef} />
      </div>
        {sheet === 'flags' && (
          <Sheet title="Feature flags" onClose={() => setSheet(null)}>
            <FlagsBody bare flags={flags} onChange={(f) => { changeFlags(f); setSheet(null) }} onReset={() => { restart(); setSheet(null) }} />
            <p className="small sheet-foot">Prototype for an Evolve case study by Cody Lampman. Estimates are demo numbers.</p>
          </Sheet>
        )}
      </div>
      <p className="footnote desktop-only">Prototype for an Evolve case study by Cody Lampman. Estimates are demo numbers.</p>
      </div>
      <aside className="side side-flags" aria-label="Feature flags">
        <FlagsBody flags={flags} onChange={changeFlags} onReset={restart} />
      </aside>
    </div>
  )
}

// Desktop only: why the prototype is a phone, and how to use it.
function DesktopNotes() {
  const [qr, setQr] = useState('')
  useEffect(() => {
    const url = window.location.origin + window.location.pathname
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#34163d', light: '#ffffff' } }).then(setQr).catch(() => {})
  }, [])
  return (
    <aside className="side side-notes">
      <p className="eyebrow">Evolve owner RFI · case study</p>
      <h2>Designed for the phone</h2>
      <p>
        Many owners open the RFI on a phone, arriving from search and social ads. The two steps that lose the most
        owners, address and contact, are the typing steps, and typing is hardest on a phone keyboard. So this is
        designed phone first and shown here in a phone frame.
      </p>
      {qr && (
        <div className="qr">
          <img src={qr} alt="QR code to open this prototype on your phone" width={120} height={120} />
          <span>Best on your phone. Scan to open it.</span>
        </div>
      )}
      <h3>How to use it</h3>
      <ul>
        <li>Go through the flow as an owner would. Try answering that you already rent it out with a property manager.</li>
        <li>
          <strong>Control</strong> recreates today's flow. <strong>Proposed</strong> turns on every change.
        </li>
        <li>Each flag on the right is one change from the test plan, so you can see any change on its own.</li>
        <li>The event log shows what I'd track for each step.</li>
      </ul>
      <p className="small">Estimates are demo numbers. Nothing you enter is sent anywhere.</p>
    </aside>
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
  editAnswers: () => void
}

function Step({ id, a, flags, update, next, restart, back, editAnswers }: StepProps) {
  switch (id) {
    case 'intent':
      return (
        <Question title="How would you like to get started with Evolve?">
          <Choices
            options={[
              ['single', 'Looking to rent out my property', undefined, <IconHouse />],
              ['multiple', 'Looking to rent multiple properties', undefined, <IconHomes />],
              ['buy', 'Looking to buy a property', undefined, <IconAFrame />],
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
            This prototype focuses on owners renting out one property, the path the brief is about. The multiple-property
            and buying paths are unchanged. They end at the same contact step, so the contact changes would apply to them
            too.
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
              ['home', 'A whole home or condo', 'house, cabin, townhouse, studio, tiny home, etc.', <IconHouse />],
              ['room', 'A private room', undefined, <IconDoor />],
              ['timeshare', 'A timeshare', undefined, <IconCalendar />],
              ['other', 'Something else', 'tent, houseboat, or movable camper', <IconTent />],
            ]}
            value={a.propertyType}
            onPick={(v) => next('propertyType', { propertyType: v as Answers['propertyType'] })}
          />
        </Question>
      )

    case 'bedrooms':
      return (
        <Question title="How many bedrooms does your property have?" note={<><strong>Over 30,000 owners trust Evolve</strong> to rent out homes like yours.</>}>
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
        <Question title="Are you currently renting it out as a vacation rental?" note={<strong>Good news: we already host guests near you.</strong>}>
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
          note={<><strong>{OWNER_COPY[ownerType(a)].title}</strong> {OWNER_COPY[ownerType(a)].body}</>}
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
      return <EstimateStep a={a} flags={flags} next={next} editAnswers={editAnswers} />

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
          <p className="body">Thanks for telling us about your home. Someone from our team will follow up soon.</p>
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
    <Question title={zipOnly ? 'Enter your ZIP code to see what your home could earn' : 'Where is it located?'}>
      <Field
        label={zipOnly ? 'ZIP code' : 'Address or zip code'}
        help={
          flags.whyCopy
            ? zipOnly
              ? "Just your ZIP for now. We'll ask for the full address next to sharpen your estimate."
              : 'We use your address to look up your home and estimate what it could earn.'
            : undefined
        }
        error={error}
      >
        <span className="input-icon">
          <IconPin />
        </span>
        <input
          className="with-icon"
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

function EstimateStep({ a, flags, next, editAnswers }: Pick<StepProps, 'a' | 'flags' | 'next' | 'editAnswers'>) {
  const [lo, hi] = estimateRange(a.bedrooms, a.location, a.stayType)
  const [street, setStreet] = useState(a.street)
  const [error, setError] = useState('')
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
        <span className="estimate-basis">A starting point based on similar homes near {a.location}.</span>
        <button className="link estimate-edit" onClick={editAnswers}>
          Edit your answers
        </button>
      </div>
      <p className="proof">Owners with Evolve earn up to 18% more than the market average.</p>
      <Field
        label="Street address"
        help={flags.whyCopy ? 'We use it to look up your home and sharpen the estimate.' : undefined}
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
    <Question title="Great! Let's see if we're a fit" big>
      <Field label="First name" error={errors.first}>
        <input value={f.first} onChange={set('first')} autoComplete="given-name" onFocus={() => track('field_focus', 'contact', 'first')} />
      </Field>
      <Field label="Last name" error={errors.last}>
        <input value={f.last} onChange={set('last')} autoComplete="family-name" onFocus={() => track('field_focus', 'contact', 'last')} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" onFocus={() => track('field_focus', 'contact', 'email')} />
      </Field>
      <Field
        label={flags.requirePhone ? 'Phone' : 'Phone (optional)'}
        error={errors.phone}
        help={flags.whyCopy ? 'So our team can follow up about your home.' : undefined}
      >
        <span className="phone-row">
          <span className="country" aria-label="Country code: United States, plus 1">
            +1 <span aria-hidden="true">⌄</span>
          </span>
          <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(XXX) XXX-XXXX" onFocus={() => track('field_focus', 'contact', 'phone')} />
        </span>
      </Field>
      <button className="primary" onClick={submit}>
        Complete
      </button>
      <Note>
        <strong>You could be live in as little as a week.</strong> We'll handle the photos, listing, and pricing to get
        you there.
      </Note>
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const cta = 'Connect with our team'
  const submit = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Enter your name.'
    if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email.'
    if (flags.requirePhone || f.phone) if (phoneDigits(f.phone).length < 10) e.phone = 'Enter a 10-digit phone number.'
    setErrors(e)
    if (Object.keys(e).length) return Object.keys(e).forEach((k) => track('field_error', 'contact', k))
    track('rfi_submitted', 'contact')
    next('contact', { fullName: f.name, email: f.email, phone: f.phone })
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Question big title="Last step: how can we reach you?">
      <ol className="steps-inline" aria-label="What happens next">
        <li>Our team follows up to answer your questions about your home.</li>
        <li>You decide, with no long-term contract.</li>
      </ol>
      <Field label="Full name" error={errors.name}>
        <input value={f.name} onChange={set('name')} autoComplete="name" onFocus={() => track('field_focus', 'contact', 'name')} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" onFocus={() => track('field_focus', 'contact', 'email')} />
      </Field>
      <Field
        label={flags.requirePhone ? 'Phone' : 'Phone (optional)'}
        error={errors.phone}
        help={flags.whyCopy ? 'So our team can follow up about your home.' : undefined}
      >
        <span className="phone-row">
          <span className="country" aria-label="Country code: United States, plus 1">
            +1 <span aria-hidden="true">⌄</span>
          </span>
          <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(XXX) XXX-XXXX" onFocus={() => track('field_focus', 'contact', 'phone')} />
        </span>
      </Field>
      <button className="primary" onClick={submit}>
        {cta}
      </button>
      <p className="fine">
        By tapping "{cta}", you agree Evolve may contact you about your home by email, phone or text, and to our Terms
        and Privacy Policy. Consent isn't required to buy. Message and data rates may apply.
      </p>
    </Question>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="note">
      <span className="note-icon">
        <IconCheck />
      </span>
      <span>{children}</span>
    </div>
  )
}

function Question({ title, note, children, big }: { title: string; note?: React.ReactNode; children: React.ReactNode; big?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus({ preventScroll: true }), [title])
  return (
    <section className={`question ${big ? 'big' : ''}`}>
      {note && <Note>{note}</Note>}
      <h1 tabIndex={-1} ref={ref}>
        {title}
      </h1>
      {children}
    </section>
  )
}

type Option = [string, string, string?, React.ReactNode?]

function Choices({ options, value, onPick }: { options: Option[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="choices">
      {options.map(([v, label, sub, icon]) => (
        <button key={v} className={`choice ${value === v ? 'on' : ''} ${icon ? 'with-icon' : ''}`} onClick={() => onPick(v)}>
          {icon && <span className="choice-icon">{icon}</span>}
          <span className="choice-text">
            <span className="choice-label">{label}</span>
            {sub && <span className="choice-sub">{sub}</span>}
          </span>
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

function versionLabel(flags: Flags) {
  const preset = presetOf(flags)
  if (preset === 'control') return 'Control (today)'
  if (preset === 'proposed') return 'Proposed (all on)'
  const changes = (Object.keys(FLAG_INFO) as FlagKey[]).filter((k) => k !== 'requirePhone')
  const on = changes.filter((k) => flags[k]).length
  return `Custom, ${on} of ${changes.length} changes on${flags.requirePhone ? '' : ', phone optional'}`
}

function presetOf(flags: Flags) {
  return JSON.stringify(flags) === JSON.stringify(CONTROL) ? 'control' : JSON.stringify(flags) === JSON.stringify(PROPOSED) ? 'proposed' : 'custom'
}

// The three-dot menu, as in Evolve's current flow.
function Menu({ canEdit, onEdit, onRestart, onFlags }: { canEdit: boolean; onEdit: () => void; onRestart: () => void; onFlags: () => void }) {
  const [open, setOpen] = useState(false)
  const pick = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  return (
    <div className="menu">
      <button className="kebab" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          <button role="menuitem" disabled={!canEdit} onClick={pick(onEdit)}>
            Edit answers
          </button>
          <button role="menuitem" onClick={pick(onRestart)}>
            Start over
          </button>
          <button role="menuitem" className="mobile-only" onClick={pick(onFlags)}>
            Feature flags
          </button>
        </div>
      )}
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{title}</strong>
          <button className="link" onClick={onClose}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FlagsBody({ flags, onChange, onReset, bare }: { flags: Flags; onChange: (f: Flags) => void; onReset: () => void; bare?: boolean }) {
  const [events, setEvents] = useState<RfiEvent[]>([])
  useEffect(() => subscribe(setEvents), [])
  const preset = presetOf(flags)
  return (
    <>
      {!bare && (
      <div className="flags-head">
        <strong>Feature flags</strong>
        <button className="link" onClick={onReset}>
          Reset
        </button>
      </div>
      )}
      <p className="flags-intro">Each flag is one change from the test plan. Changes apply right where you are.</p>
      <div className="presets">
        <button className={`pill ${preset === 'control' ? 'on' : ''}`} onClick={() => onChange({ ...CONTROL })}>
          Control (today)
        </button>
        <button className={`pill ${preset === 'proposed' ? 'on' : ''}`} onClick={() => onChange({ ...PROPOSED })}>
          Proposed (all on)
        </button>
      </div>
      {bare && (
        <button className="link reset-under" onClick={onReset}>
          Reset
        </button>
      )}
      {(Object.keys(FLAG_INFO) as FlagKey[]).map((k) => (
        <label key={k} className={`flag ${flags[k] ? '' : 'is-off'}`}>
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
        <div className="events-head">
          <strong>Event log</strong>
          <span>Latest first</span>
        </div>
        <p className="events-note">
          Tracked the same way in every version, so each step's drop-off can be compared. In a live test, each owner is
          assigned one version when they arrive.
        </p>
        <p className="assigned">
          <code>assigned</code> {versionLabel(flags)}
        </p>
        <ul>
          {events
            .filter((e) => e.name !== 'flag_set')
            .slice(-6)
            .reverse()
            .map((e, i) => (
              <li key={i}>
                <code>{e.name}</code> {e.step} {e.detail && <span>· {e.detail}</span>}
              </li>
            ))}
        </ul>
      </div>
    </>
  )
}
