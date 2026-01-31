import * as allOffset from './allOffset'
import * as allInvestment from './allInvestment'
import * as split from './split'
import * as offsetThenInvestment from './offsetThenInvestment'
import * as offsetThenInvestmentMove from './offsetThenInvestmentMove'
import type { CalculationInputs } from '../../types'
import type { StrategyState, StrategyContext, ContributionAllocation } from './types'

export type StrategyType = 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'

export interface Strategy {
  allocateInitialAmount: (initialAmount: number, mortgageBalance: number, splitRatio?: number, switchYears?: number) => {
    offsetAllocation: number
    investmentAllocation: number
  }
  allocateContributions: (state: StrategyState, context: StrategyContext, splitRatio?: number, switchYears?: number) => ContributionAllocation
  handleYearStart?: (state: StrategyState, context: StrategyContext) => StrategyState
  handleMortgagePayoff: (state: StrategyState) => StrategyState
  handleExcessOffset: (state: StrategyState) => StrategyState
}

export function getStrategy(inputs: CalculationInputs): Strategy {
  if (inputs.strategy === 'allOffset') {
    return {
      allocateInitialAmount: (amount, balance) => allOffset.allocateInitialAmount(amount, balance),
      allocateContributions: (state, context) => allOffset.allocateContributions(state, context),
      handleMortgagePayoff: (state) => allOffset.handleMortgagePayoff(state),
      handleExcessOffset: (state) => allOffset.handleExcessOffset(state),
    }
  } else if (inputs.strategy === 'allInvestment') {
    return {
      allocateInitialAmount: (amount, balance) => allInvestment.allocateInitialAmount(amount, balance),
      allocateContributions: (state, context) => allInvestment.allocateContributions(state, context),
      handleMortgagePayoff: (state) => allInvestment.handleMortgagePayoff(state),
      handleExcessOffset: (state) => allInvestment.handleExcessOffset(state),
    }
  } else if (inputs.strategy === 'offsetThenInvestment') {
    const switchYears = inputs.switchYears ?? 5
    return {
      allocateInitialAmount: (amount, balance) => offsetThenInvestment.allocateInitialAmount(amount, balance),
      allocateContributions: (state, context) => offsetThenInvestment.allocateContributions(state, context, switchYears),
      handleMortgagePayoff: (state) => offsetThenInvestment.handleMortgagePayoff(state),
      handleExcessOffset: (state) => offsetThenInvestment.handleExcessOffset(state),
    }
  } else if (inputs.strategy === 'offsetThenInvestmentMove') {
    const switchYears = inputs.switchYears ?? 5
    return {
      allocateInitialAmount: (amount, balance) => offsetThenInvestmentMove.allocateInitialAmount(amount, balance),
      allocateContributions: (state, context) => offsetThenInvestmentMove.allocateContributions(state, context, switchYears),
      handleYearStart: (state, context) => offsetThenInvestmentMove.handleYearStart(state, context, switchYears),
      handleMortgagePayoff: (state) => offsetThenInvestmentMove.handleMortgagePayoff(state),
      handleExcessOffset: (state) => offsetThenInvestmentMove.handleExcessOffset(state),
    }
  } else {
    const ratio = inputs.splitRatio ?? 0.5
    return {
      allocateInitialAmount: (amount, balance) => split.allocateInitialAmount(amount, balance, ratio),
      allocateContributions: (state, context) => split.allocateContributions(state, context, ratio),
      handleMortgagePayoff: (state) => split.handleMortgagePayoff(state),
      handleExcessOffset: (state) => split.handleExcessOffset(state),
    }
  }
}

export { calculateAmortizedPayment, processMortgagePayment, applyMortgagePayment, calculateInvestmentGrowth, calculateTaxes } from './shared'
