// DEMO NUMBERS ONLY. A real version would come from Evolve's revenue data
// for comparable homes. The range is deliberately wide and labelled with
// its basis, so it informs owners without overpromising (trust gate).

const BASE: Record<number, [number, number]> = {
  1: [16000, 23000],
  2: [24000, 33000],
  3: [32000, 44000],
  4: [40000, 55000],
  5: [48000, 66000],
}

export function estimateRange(bedrooms: number, zip: string, stayType?: string): [number, number] {
  const [lo, hi] = BASE[Math.min(Math.max(bedrooms, 1), 5)]
  // Stable demo variation by ZIP, plus or minus 10 percent.
  const digits = zip.replace(/\D/g, '')
  const seed = digits.split('').reduce((sum, d) => sum + Number(d), 0)
  const factor = 0.9 + (seed % 21) / 100
  const stay = stayType === 'monthly' ? 0.8 : 1
  const round = (n: number) => Math.round((n * factor * stay) / 500) * 500
  return [round(lo), round(hi)]
}

export const money = (n: number) => '$' + n.toLocaleString('en-US')
