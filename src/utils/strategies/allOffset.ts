import type { StrategyState, StrategyContext, ContributionAllocation } from './types'

export function allocateInitialAmount(
  initialAmount: number,
  mortgageBalance: number
): { offsetAllocation: number; investmentAllocation: number } {
  const offsetAllocation = Math.min(initialAmount, mortgageBalance)
  const investmentAllocation = Math.max(0, initialAmount - offsetAllocation)
  return { offsetAllocation, investmentAllocation }
}

export function allocateContributions(
  state: StrategyState,
  context: StrategyContext
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
    const contributionToOffset = Math.min(annualContribution, mortgageBalance - offsetBalance)
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
  const { mortgageBalance, offsetBalance, investmentValue, investmentCostBasis } = state

  if (mortgageBalance === 0 && offsetBalance > 0) {
    return {
      ...state,
      offsetBalance: 0,
      investmentValue: investmentValue + offsetBalance,
      investmentCostBasis: investmentCostBasis + offsetBalance,
    }
  }

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
