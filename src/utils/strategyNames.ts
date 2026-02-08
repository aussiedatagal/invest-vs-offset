export type StrategyKey = 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'

export function getStrategyName(
  strategy: StrategyKey,
  splitRatio?: number,
  switchYears?: number
): string {
  if (strategy === 'allOffset') return 'Prioritise offset'
  if (strategy === 'allInvestment') return 'Prioritise investments'
  if (strategy === 'offsetThenInvestment') return `Offset for ${switchYears ?? 5} years then invest`
  if (strategy === 'offsetThenInvestmentMove') return `Offset for ${switchYears ?? 5} years then invest (move offset balance)`
  return `Split between offset and investments (${Math.round((splitRatio ?? 0.5) * 100)}% offset)`
}
