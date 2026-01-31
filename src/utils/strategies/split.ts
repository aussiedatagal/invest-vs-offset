import type { StrategyState, StrategyContext, ContributionAllocation } from './types'

export function allocateInitialAmount(
  initialAmount: number,
  mortgageBalance: number,
  splitRatio: number
): { offsetAllocation: number; investmentAllocation: number } {
  const maxOffset = Math.min(initialAmount * splitRatio, mortgageBalance)
  return {
    offsetAllocation: maxOffset,
    investmentAllocation: initialAmount - maxOffset,
  }
}

export function allocateContributions(
  state: StrategyState,
  context: StrategyContext,
  splitRatio: number
): ContributionAllocation {
  const { mortgageBalance, offsetBalance } = state
  const { annualContribution, mortgagePaidOff } = context

  if (mortgagePaidOff || annualContribution === 0) {
    return {
      contributionToOffset: 0,
      contributionToInvestment: annualContribution,
    }
  }

  if (mortgageBalance > 0) {
    const maxOffsetSpace = Math.max(0, mortgageBalance - offsetBalance)
    const contributionToOffset = Math.min(annualContribution * splitRatio, maxOffsetSpace)
    const contributionToInvestment = annualContribution - contributionToOffset
    return { contributionToOffset, contributionToInvestment }
  }

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
  const { mortgageBalance, offsetBalance, investmentValue, investmentCostBasis } = state

  if (offsetBalance > mortgageBalance) {
    const excessOffset = offsetBalance - mortgageBalance
    return {
      ...state,
      offsetBalance: mortgageBalance,
      investmentValue: investmentValue + excessOffset,
      investmentCostBasis: investmentCostBasis + excessOffset,
    }
  }

  return state
}
