import { calculateStrategy } from '../src/utils/calculations'
import { defaultInputs } from '../src/utils/defaults'

function roundTo(n: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

const years = 30
const step = 0.01
const steps = Math.round(1 / step)

const ratios: number[] = []
const netWorths: number[] = []

for (let i = 0; i <= steps; i++) {
  const ratio = roundTo(Math.min(1, i * step), 2)
  const results = calculateStrategy(
    { ...defaultInputs, strategy: 'split', splitRatio: ratio },
    years
  )
  const netWorth = results.find(result => result.year === years)?.netWorth ?? 0
  ratios.push(ratio)
  netWorths.push(roundTo(netWorth, 2))
}

const output = {
  years,
  step,
  ratios,
  netWorths,
  inputs: defaultInputs,
}

function cleanNumber(_key: string, value: unknown): unknown {
  if (typeof value === 'number') return Number(value.toFixed(4))
  return value
}

process.stdout.write(JSON.stringify(output, cleanNumber, 2))
