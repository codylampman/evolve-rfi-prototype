// A tiny event log standing in for real analytics. It shows what we would
// instrument to measure drop-off per step and per field.

export type RfiEvent = {
  name: 'step_viewed' | 'step_completed' | 'step_back' | 'field_focus' | 'field_error' | 'rfi_submitted' | 'not_a_fit'
  step?: string
  detail?: string
  at: string
}

type Listener = (events: RfiEvent[]) => void

const events: RfiEvent[] = []
const listeners = new Set<Listener>()

export function track(name: RfiEvent['name'], step?: string, detail?: string) {
  const e: RfiEvent = { name, step, detail, at: new Date().toLocaleTimeString() }
  events.push(e)
  console.info('[rfi]', name, step ?? '', detail ?? '')
  listeners.forEach((l) => l([...events]))
}

export function subscribe(l: Listener) {
  listeners.add(l)
  l([...events])
  return () => {
    listeners.delete(l)
  }
}
