import { calculateStrategy } from '../src/utils/calculations'
import { defaultInputs } from '../src/utils/defaults'

function roundTo(n: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

const years = 20
const minRate = 0.0
const maxRate = 0.15
const step = 0.001
const steps = Math.round((maxRate - minRate) / step)

const investmentRates: number[] = []
const offsetNetWorths: number[] = []
const investNetWorths: number[] = []

for (let i = 0; i <= steps; i++) {
  const investmentRate = roundTo(minRate + i * step, 5)
  const inputs = {
    ...defaultInputs,
    investmentReturnRate: investmentRate,
    dividendYield: 0,
    years,
  }

  const offsetResults = calculateStrategy(
    { ...inputs, strategy: 'allOffset' },
    years
  )
  const investResults = calculateStrategy(
    { ...inputs, strategy: 'allInvestment' },
    years
  )

  const offsetNetWorth = offsetResults.find(result => result.year === years)?.netWorth ?? 0
  const investNetWorth = investResults.find(result => result.year === years)?.netWorth ?? 0

  investmentRates.push(roundTo(investmentRate * 100, 2))
  offsetNetWorths.push(roundTo(offsetNetWorth, 2))
  investNetWorths.push(roundTo(investNetWorth, 2))
}

const output = {
  years,
  minRate,
  maxRate,
  step,
  investmentRates,
  offsetNetWorths,
  investNetWorths,
  inputs: {
    ...defaultInputs,
    dividendYield: 0,
  },
}

function cleanNumber(_key: string, value: unknown): unknown {
  if (typeof value === 'number') return Number(value.toFixed(4))
  return value
}

process.stdout.write(JSON.stringify(output, cleanNumber, 2))
