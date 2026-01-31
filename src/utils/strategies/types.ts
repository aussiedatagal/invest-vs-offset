import { CalculationInputs } from '../../types'

export interface StrategyState {
  mortgageBalance: number
  offsetBalance: number
  investmentValue: number
  investmentCostBasis: number
  offsetTotalInvested: number
}

export interface StrategyContext {
  inputs: CalculationInputs
  mortgagePayment: number
  annualContribution: number
  effectiveInterestRate: number
  year: number
  mortgagePaidOff: boolean
}

export interface ContributionAllocation {
  contributionToOffset: number
  contributionToInvestment: number
}

export interface MortgagePaymentResult {
  principalPaid: number
  freedUpFromMortgagePayment: number
  actualMortgagePayment: number
  interestAccrued: number
  interestSavedThisYear: number
}
