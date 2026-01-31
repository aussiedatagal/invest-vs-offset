import type { StrategyState, StrategyContext, ContributionAllocation } from './types'

export function allocateInitialAmount(
  initialAmount: number,
  _mortgageBalance: number
): { offsetAllocation: number; investmentAllocation: number } {
  return {
    offsetAllocation: 0,
    investmentAllocation: initialAmount,
  }
}

export function allocateContributions(
  _state: StrategyState,
  context: StrategyContext
): ContributionAllocation {
  const { annualContribution } = context
  return {
    contributionToOffset: 0,
    contributionToInvestment: annualContribution,
  }
}

export function handleMortgagePayoff(
  state: StrategyState
): StrategyState {
  return state
}

export function handleExcessOffset(
  state: StrategyState
): StrategyState {
  return state
}
