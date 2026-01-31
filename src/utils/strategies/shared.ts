import { CalculationInputs } from '../../types'
import type { StrategyState, StrategyContext, MortgagePaymentResult } from './types'

export function calculateAmortizedPayment(
  principal: number,
  annualRate: number,
  years: number,
  paymentsPerYear = 52
): number {
  if (years <= 0 || principal <= 0 || !isFinite(principal) || !isFinite(annualRate) || !isFinite(years)) {
    return 0
  }
  if (annualRate < 0 || annualRate > 1) {
    return 0
  }
  if (annualRate === 0) {
    return principal / years
  }
  const ratePerPeriod = annualRate / paymentsPerYear
  const totalPayments = years * paymentsPerYear
  if (ratePerPeriod <= -1) {
    return 0
  }
  const paymentPerPeriod = (principal * ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPayments)) / 
    (Math.pow(1 + ratePerPeriod, totalPayments) - 1)
  if (!isFinite(paymentPerPeriod)) {
    return 0
  }
  return paymentPerPeriod * paymentsPerYear
}

export function processMortgagePayment(
  state: StrategyState,
  context: StrategyContext
): MortgagePaymentResult {
  const { inputs, mortgagePayment, effectiveInterestRate } = context

  const offsetApplied = Math.min(state.offsetBalance, state.mortgageBalance)
  const outstandingBalance = Math.max(0, state.mortgageBalance - offsetApplied)
  const interestAccrued = outstandingBalance * inputs.mortgageInterestRate
  const interestSavedThisYear = offsetApplied * effectiveInterestRate

  let principalPaid = 0
  let freedUpFromMortgagePayment = 0
  let actualMortgagePayment = mortgagePayment

  // If mortgage is already paid off, no payment goes to mortgage
  if (state.mortgageBalance === 0) {
    principalPaid = 0
    freedUpFromMortgagePayment = mortgagePayment
    actualMortgagePayment = 0
  } else {
    // Mortgage balance calculation is independent of offset
    // Interest is calculated on (mortgage balance - offset balance), but mortgage balance itself is not affected by offset
    // Principal paid = payment - interest, but cannot exceed remaining mortgage balance
    principalPaid = Math.max(0, Math.min(mortgagePayment - interestAccrued, state.mortgageBalance))
    
    // If payment exceeds what's needed to pay off the mortgage, the excess goes to investments
    const totalNeeded = interestAccrued + state.mortgageBalance
    if (mortgagePayment > totalNeeded) {
      freedUpFromMortgagePayment = mortgagePayment - totalNeeded
      actualMortgagePayment = totalNeeded
    } else {
      freedUpFromMortgagePayment = 0
      actualMortgagePayment = mortgagePayment
    }
  }

  return {
    principalPaid,
    freedUpFromMortgagePayment,
    actualMortgagePayment,
    interestAccrued,
    interestSavedThisYear,
  }
}

export function applyMortgagePayment(
  state: StrategyState,
  result: MortgagePaymentResult
): StrategyState {
  const { mortgageBalance, offsetBalance } = state
  const { principalPaid } = result

  // Mortgage balance always reduces by principal paid
  const newMortgageBalance = Math.max(0, mortgageBalance - principalPaid)
  // Offset balance stays the same (it doesn't get reduced by payments)
  const newOffsetBalance = offsetBalance

  return {
    ...state,
    mortgageBalance: newMortgageBalance,
    offsetBalance: newOffsetBalance,
  }
}

export function calculateInvestmentGrowth(
  investmentValue: number,
  inputs: CalculationInputs
): {
  yearCapitalGain: number
  yearDividends: number
  yearDividendTax: number
  afterTaxDividends: number
} {
  if (investmentValue <= 0) {
    return {
      yearCapitalGain: 0,
      yearDividends: 0,
      yearDividendTax: 0,
      afterTaxDividends: 0,
    }
  }

  const yearCapitalGain = investmentValue * inputs.investmentReturnRate
  const yearDividends = investmentValue * inputs.dividendYield
  const yearDividendTax = yearDividends * inputs.personalTaxRate
  const afterTaxDividends = yearDividends - yearDividendTax

  return {
    yearCapitalGain,
    yearDividends,
    yearDividendTax,
    afterTaxDividends,
  }
}

export function calculateTaxes(
  investmentValue: number,
  investmentCostBasis: number,
  cumulativeDividendTax: number,
  inputs: CalculationInputs
): {
  capitalGainsTax: number
  capitalGainsTaxBeforeDiscount: number
  capitalGainsDiscount: number
  totalTax: number
} {
  const actualCapitalGain = Math.max(0, investmentValue - investmentCostBasis)
  const capitalGainsTaxBeforeDiscount = actualCapitalGain * inputs.personalTaxRate
  const totalCapitalGainsDiscount = actualCapitalGain * inputs.capitalGainsRate
  const capitalGainsDiscountBenefit = totalCapitalGainsDiscount * inputs.personalTaxRate
  const capitalGainsTax = capitalGainsTaxBeforeDiscount - capitalGainsDiscountBenefit
  const totalTax = capitalGainsTax + cumulativeDividendTax

  return {
    capitalGainsTax,
    capitalGainsTaxBeforeDiscount,
    capitalGainsDiscount: capitalGainsDiscountBenefit,
    totalTax,
  }
}
