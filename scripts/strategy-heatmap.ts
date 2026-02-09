import { calculateStrategy } from '../src/utils/calculations'
import { defaultInputs } from '../src/utils/defaults'

function roundTo(n: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

const years = 20
const mortgageRateMin = 0.02
const mortgageRateMax = 0.10
const returnRateMin = 0.02
const returnRateMax = 0.12
const step = 0.0025

const mortgageRateSteps = Math.round((mortgageRateMax - mortgageRateMin) / step)
const returnRateSteps = Math.round((returnRateMax - returnRateMin) / step)

const mortgageRatesPct: number[] = []
const returnRatesPct: number[] = []
const winnerGrid: ('offset' | 'invest')[][] = []

for (let ri = 0; ri <= returnRateSteps; ri++) {
  const returnRate = roundTo(returnRateMin + ri * step, 5)
  returnRatesPct.push(roundTo(returnRate * 100, 2))
  const row: ('offset' | 'invest')[] = []
  for (let mi = 0; mi <= mortgageRateSteps; mi++) {
    const mortgageRate = roundTo(mortgageRateMin + mi * step, 5)
    if (ri === 0) {
      mortgageRatesPct.push(roundTo(mortgageRate * 100, 2))
    }
    const inputs = {
      ...defaultInputs,
      mortgageInterestRate: mortgageRate,
      investmentReturnRate: returnRate,
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
    const offsetNetWorth =
      offsetResults.find((r) => r.year === years)?.netWorth ?? 0
    const investNetWorth =
      investResults.find((r) => r.year === years)?.netWorth ?? 0
    row.push(offsetNetWorth >= investNetWorth ? 'offset' : 'invest')
  }
  winnerGrid.push(row)
}

const output = {
  years,
  mortgageRateMinPct: roundTo(mortgageRateMin * 100, 2),
  mortgageRateMaxPct: roundTo(mortgageRateMax * 100, 2),
  returnRateMinPct: roundTo(returnRateMin * 100, 2),
  returnRateMaxPct: roundTo(returnRateMax * 100, 2),
  stepPct: roundTo(step * 100, 2),
  mortgageRatesPct,
  returnRatesPct,
  winnerGrid,
  inputs: {
    ...defaultInputs,
    dividendYield: 0,
    years,
  },
}

function cleanNumber(_key: string, value: unknown): unknown {
  if (typeof value === 'number') return Number(value.toFixed(4))
  return value
}

process.stdout.write(JSON.stringify(output, cleanNumber, 2))
