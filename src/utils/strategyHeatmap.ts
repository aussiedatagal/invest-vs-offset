import { CalculationInputs } from '../types'
import { calculateStrategy } from './calculations'
import type { StrategyKey } from './strategyNames'

const MORTGAGE_MIN_PCT = 2
const MORTGAGE_MAX_PCT = 10
const RETURN_MIN_PCT = 2
const RETURN_MAX_PCT = 12
const STEP_PCT = 0.5

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type HeatmapWinner = 'left' | 'right'

export function computeMortgageReturnHeatmap(
  baseInputs: CalculationInputs,
  leftStrategy: StrategyKey,
  rightStrategy: StrategyKey,
  splitRatio: number,
  switchYears: number
): {
  mortgageRatesPct: number[]
  returnRatesPct: number[]
  winnerGrid: HeatmapWinner[][]
} {
  const years = baseInputs.years
  const mortgageRatesPct: number[] = []
  const returnRatesPct: number[] = []
  const winnerGrid: HeatmapWinner[][] = []

  for (let m = MORTGAGE_MIN_PCT; m <= MORTGAGE_MAX_PCT; m += STEP_PCT) {
    mortgageRatesPct.push(round2(m))
  }
  for (let r = RETURN_MIN_PCT; r <= RETURN_MAX_PCT; r += STEP_PCT) {
    returnRatesPct.push(round2(r))
  }

  const returnRates = returnRatesPct.map((p) => p / 100)
  const mortgageRates = mortgageRatesPct.map((p) => p / 100)

  for (let ri = 0; ri < returnRates.length; ri++) {
    const returnRate = returnRates[ri]
    const row: HeatmapWinner[] = []
    for (let mi = 0; mi < mortgageRates.length; mi++) {
      const mortgageRate = mortgageRates[mi]
      const inputs = {
        ...baseInputs,
        mortgageInterestRate: mortgageRate,
        investmentReturnRate: returnRate,
        splitRatio,
        switchYears,
      }
      const leftResults = calculateStrategy(
        { ...inputs, strategy: leftStrategy },
        years
      )
      const rightResults = calculateStrategy(
        { ...inputs, strategy: rightStrategy },
        years
      )
      const leftNetWorth = leftResults.find((r) => r.year === years)?.netWorth ?? 0
      const rightNetWorth = rightResults.find((r) => r.year === years)?.netWorth ?? 0
      row.push(leftNetWorth >= rightNetWorth ? 'left' : 'right')
    }
    winnerGrid.push(row)
  }
  return { mortgageRatesPct, returnRatesPct, winnerGrid }
}

