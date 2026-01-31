import { CalculationInputs, YearResult, MonthResult } from '../types'
import {
  getStrategy,
  calculateAmortizedPayment,
  processMortgagePayment,
  applyMortgagePayment,
  calculateInvestmentGrowth,
  calculateTaxes,
} from './strategies'
import type { StrategyState, StrategyContext } from './strategies/types'

export { calculateAmortizedPayment }

export function calculateStrategy(
  inputs: CalculationInputs,
  maxYears?: number
): YearResult[] {
  const results: YearResult[] = []
  const strategy = getStrategy(inputs)

  const annualContribution = (inputs.weeklyContribution || 0) * 52
  const yearsToRun = maxYears || inputs.years
  const mortgagePayment = calculateAmortizedPayment(
    inputs.mortgageBalance,
    inputs.mortgageInterestRate,
    inputs.years
  )

  let cumulativeCapitalGain = 0
  let totalAfterTaxDividends = 0
  let totalInterestPaid = 0
  let totalInterestSaved = 0
  let cumulativeDividendTax = 0
  let cumulativeMortgagePayments = 0
  let actualMortgagePaymentsTotal = 0
  let mortgagePaymentsAfterPayoff = 0
  let actualInvestmentContributions = 0
  let freedUpMortgagePaymentsTotal = 0

  const effectiveInterestRate = inputs.isInvestmentProperty
    ? inputs.mortgageInterestRate * (1 - inputs.personalTaxRate)
    : inputs.mortgageInterestRate

  const { offsetAllocation, investmentAllocation } = strategy.allocateInitialAmount(
    inputs.initialAmount,
    inputs.mortgageBalance,
    inputs.splitRatio,
    inputs.switchYears
  )

  let state: StrategyState = {
    mortgageBalance: inputs.mortgageBalance,
    offsetBalance: offsetAllocation,
    investmentValue: investmentAllocation,
    investmentCostBasis: investmentAllocation,
    offsetTotalInvested: offsetAllocation,
  }

  for (let year = 1; year <= yearsToRun; year++) {
    const startState = { ...state }
    const mortgagePaidOff = startState.mortgageBalance <= 0

    const context: StrategyContext = {
      inputs,
      mortgagePayment,
      annualContribution,
      effectiveInterestRate,
      year,
      mortgagePaidOff,
    }

    if (strategy.handleYearStart) {
      state = strategy.handleYearStart(state, context)
    }

    const mortgageResult = processMortgagePayment(state, context)
    state = applyMortgagePayment(state, mortgageResult)

    const afterTaxInterest = inputs.isInvestmentProperty
      ? mortgageResult.interestAccrued * (1 - inputs.personalTaxRate)
      : mortgageResult.interestAccrued
    totalInterestPaid += afterTaxInterest
    totalInterestSaved += mortgageResult.interestSavedThisYear

    // Calculate tax refund from interest payments (for investment properties)
    const taxRefundFromInterest = inputs.isInvestmentProperty
      ? mortgageResult.interestAccrued * inputs.personalTaxRate
      : 0

    cumulativeMortgagePayments += mortgagePayment
    if (startState.mortgageBalance > 0) {
      actualMortgagePaymentsTotal += mortgageResult.actualMortgagePayment
    } else {
      mortgagePaymentsAfterPayoff += mortgagePayment
    }

    state = strategy.handleMortgagePayoff(state)
    state = strategy.handleExcessOffset(state)

    // Calculate growth on investment value BEFORE adding new contributions
    // This assumes contributions are made at the end of the year (or earn returns for half year on average)
    // handleExcessOffset is called before growth so offset moved to investments can earn growth
    const investmentValueBeforeContributions = state.investmentValue
    const growth = calculateInvestmentGrowth(investmentValueBeforeContributions, inputs)
    cumulativeCapitalGain += growth.yearCapitalGain
    cumulativeDividendTax += growth.yearDividendTax
    totalAfterTaxDividends += growth.afterTaxDividends
    state.investmentValue += growth.yearCapitalGain + growth.afterTaxDividends
    state.investmentCostBasis += growth.afterTaxDividends

    // Add tax refund to contributions - it should be allocated according to the strategy
    const contributionWithTaxRefund = annualContribution + taxRefundFromInterest
    const contextWithTaxRefund: StrategyContext = {
      ...context,
      annualContribution: contributionWithTaxRefund,
    }
    const contributionAllocation = strategy.allocateContributions(state, contextWithTaxRefund, inputs.splitRatio, inputs.switchYears)

    if (contributionWithTaxRefund > 0) {
      state.offsetBalance += contributionAllocation.contributionToOffset
      state.offsetTotalInvested += contributionAllocation.contributionToOffset
      state.investmentValue += contributionAllocation.contributionToInvestment
      state.investmentCostBasis += contributionAllocation.contributionToInvestment
    }
    actualInvestmentContributions += contributionAllocation.contributionToInvestment

    if (mortgageResult.freedUpFromMortgagePayment > 0) {
      state.investmentValue += mortgageResult.freedUpFromMortgagePayment
      state.investmentCostBasis += mortgageResult.freedUpFromMortgagePayment
      freedUpMortgagePaymentsTotal += mortgageResult.freedUpFromMortgagePayment
      actualInvestmentContributions += mortgageResult.freedUpFromMortgagePayment
    }

    const investmentValueBeforeGrowth = investmentValueBeforeContributions

    const taxes = calculateTaxes(
      state.investmentValue,
      state.investmentCostBasis,
      cumulativeDividendTax,
      inputs
    )

    // Net worth after CGT (assuming gradual selling to stay in personal tax bracket)
    const netWorth = state.investmentValue - taxes.capitalGainsTax + state.offsetBalance - state.mortgageBalance

    const offsetMovedToInvestments = Math.max(
      0,
      startState.offsetBalance + contributionAllocation.contributionToOffset - state.offsetBalance
    )
    const netOffsetContribution = contributionAllocation.contributionToOffset - offsetMovedToInvestments

    // Calculate how much of the tax refund went to offset vs investments
    let taxRefundToOffset = 0
    let taxRefundToInvestment = 0
    if (taxRefundFromInterest > 0 && contributionWithTaxRefund > 0) {
      const taxRefundProportionToOffset = contributionAllocation.contributionToOffset / contributionWithTaxRefund
      const taxRefundProportionToInvestment = contributionAllocation.contributionToInvestment / contributionWithTaxRefund
      taxRefundToOffset = taxRefundFromInterest * taxRefundProportionToOffset
      taxRefundToInvestment = taxRefundFromInterest * taxRefundProportionToInvestment
    }

    results.push({
      year,
      mortgageBalance: state.mortgageBalance,
      previousMortgageBalance: startState.mortgageBalance,
      mortgageInterest: mortgageResult.interestAccrued,
      mortgagePayment: mortgageResult.actualMortgagePayment, // Actual payment to mortgage (may be less than budgeted if mortgage paid off)
      principalPaid: mortgageResult.principalPaid,
      offsetBalance: state.offsetBalance,
      previousOffsetBalance: startState.offsetBalance,
      offsetContribution: netOffsetContribution,
      investmentValue: state.investmentValue,
      previousInvestmentValue: investmentValueBeforeGrowth,
      capitalGains: growth.yearCapitalGain,
      dividends: growth.yearDividends,
      capitalGainsTax: taxes.capitalGainsTax,
      capitalGainsTaxBeforeDiscount: taxes.capitalGainsTaxBeforeDiscount,
      capitalGainsDiscount: taxes.capitalGainsDiscount,
      dividendTax: growth.yearDividendTax,
      investmentContribution: contributionAllocation.contributionToInvestment + mortgageResult.freedUpFromMortgagePayment + offsetMovedToInvestments,
      netWorth: netWorth,
      totalReturn: cumulativeCapitalGain + totalAfterTaxDividends,
      interestPaid: totalInterestPaid,
      interestSaved: totalInterestSaved,
      totalTax: taxes.totalTax,
      offsetTotalInvested: state.offsetTotalInvested,
      investmentTotalInvested: state.investmentCostBasis,
      actualInvestmentContributions: actualInvestmentContributions,
      freedUpMortgagePaymentsTotal: freedUpMortgagePaymentsTotal,
      offsetNetGains: totalInterestSaved,
      investmentNetGains: cumulativeCapitalGain + totalAfterTaxDividends,
      outstandingBalanceForInterest: Math.max(0, startState.mortgageBalance - Math.min(startState.offsetBalance, startState.mortgageBalance)),
      cumulativeMortgagePayments: cumulativeMortgagePayments,
      actualMortgagePaymentsTotal: actualMortgagePaymentsTotal,
      mortgagePaymentsAfterPayoff: mortgagePaymentsAfterPayoff,
      taxRefundFromInterest: taxRefundFromInterest,
      taxRefundToOffset: taxRefundToOffset,
      taxRefundToInvestment: taxRefundToInvestment,
    })
  }

  return results
}

function findPayoffYear(inputs: CalculationInputs): number {
  const maxSearchYears = Math.max(inputs.years, 50)
  const tempResults = calculateStrategy(inputs, maxSearchYears)
  
  const payoffYear = tempResults.findIndex(r => r.mortgageBalance <= 0)
  if (payoffYear !== -1) {
    return payoffYear + 1
  }
  return maxSearchYears
}

export function calculateComparison(
  inputs: CalculationInputs, 
  leftStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' = 'allOffset',
  rightStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' = 'allInvestment',
  maxYearsOverride?: number
): {
  left: YearResult[]
  right: YearResult[]
  leftStrategy: string
  rightStrategy: string
} {
  const leftInputs = { ...inputs, strategy: leftStrategy as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' }
  const rightInputs = { ...inputs, strategy: rightStrategy as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' }

  let maxYears: number
  if (maxYearsOverride !== undefined) {
    maxYears = maxYearsOverride
  } else {
    const leftPayoffYear = findPayoffYear(leftInputs)
    const rightPayoffYear = findPayoffYear(rightInputs)
    maxYears = Math.max(leftPayoffYear, rightPayoffYear)
  }

  const left = calculateStrategy(leftInputs, maxYears)
  const right = calculateStrategy(rightInputs, maxYears)

  return {
    left,
    right,
    leftStrategy: leftStrategy,
    rightStrategy: rightStrategy,
  }
}

function getNetWorthAtYear(results: YearResult[], year: number): number {
  const match = results.find(result => result.year === year)
  return match ? match.netWorth : results[results.length - 1]?.netWorth ?? 0
}

export function calculateStrategyMonthly(
  inputs: CalculationInputs,
  maxYears?: number
): MonthResult[] {
  const results: MonthResult[] = []
  const strategy = getStrategy(inputs)

  const monthlyContribution = (inputs.weeklyContribution || 0) * (52 / 12)
  const yearsToRun = maxYears || inputs.years
  const totalMonths = yearsToRun * 12
  const annualMortgagePayment = calculateAmortizedPayment(
    inputs.mortgageBalance,
    inputs.mortgageInterestRate,
    inputs.years
  )
  const monthlyMortgagePayment = annualMortgagePayment / 12

  // Convert annual rates to monthly compound rates
  const monthlyMortgageInterestRate = Math.pow(1 + inputs.mortgageInterestRate, 1/12) - 1
  const monthlyInvestmentReturnRate = Math.pow(1 + inputs.investmentReturnRate, 1/12) - 1
  const monthlyDividendYield = Math.pow(1 + inputs.dividendYield, 1/12) - 1

  let cumulativeCapitalGain = 0
  let totalAfterTaxDividends = 0
  let totalInterestPaid = 0
  let totalInterestSaved = 0
  let cumulativeDividendTax = 0
  let cumulativeMortgagePayments = 0
  let actualMortgagePaymentsTotal = 0
  let mortgagePaymentsAfterPayoff = 0
  let actualInvestmentContributions = 0
  let freedUpMortgagePaymentsTotal = 0

  const effectiveInterestRate = inputs.isInvestmentProperty
    ? inputs.mortgageInterestRate * (1 - inputs.personalTaxRate)
    : inputs.mortgageInterestRate
  const monthlyEffectiveInterestRate = effectiveInterestRate / 12

  const { offsetAllocation, investmentAllocation } = strategy.allocateInitialAmount(
    inputs.initialAmount,
    inputs.mortgageBalance,
    inputs.splitRatio,
    inputs.switchYears
  )

  let state: StrategyState = {
    mortgageBalance: inputs.mortgageBalance,
    offsetBalance: offsetAllocation,
    investmentValue: investmentAllocation,
    investmentCostBasis: investmentAllocation,
    offsetTotalInvested: offsetAllocation,
  }

  for (let month = 1; month <= totalMonths; month++) {
    const startState = { ...state }
    const mortgagePaidOff = startState.mortgageBalance <= 0
    const year = Math.ceil(month / 12)

    // Convert monthly rates back to annual equivalent for calculateInvestmentGrowth
    // (which expects annual rates but we'll divide the result by 12)
    const monthlyInputs: CalculationInputs = {
      ...inputs,
      mortgageInterestRate: monthlyMortgageInterestRate * 12,
      investmentReturnRate: monthlyInvestmentReturnRate * 12,
      dividendYield: monthlyDividendYield * 12,
    }

    const context: StrategyContext = {
      inputs: monthlyInputs,
      mortgagePayment: monthlyMortgagePayment * 12,
      annualContribution: monthlyContribution * 12,
      effectiveInterestRate: monthlyEffectiveInterestRate * 12,
      year,
      mortgagePaidOff,
    }

    if (strategy.handleYearStart) {
      state = strategy.handleYearStart(state, context)
    }

    const mortgageResult = processMortgagePayment(state, context)
    
    const monthlyMortgageResult = {
      principalPaid: mortgageResult.principalPaid / 12,
      freedUpFromMortgagePayment: mortgageResult.freedUpFromMortgagePayment / 12,
      actualMortgagePayment: mortgageResult.actualMortgagePayment / 12,
      interestAccrued: mortgageResult.interestAccrued / 12,
      interestSavedThisYear: mortgageResult.interestSavedThisYear / 12,
    }

    state = applyMortgagePayment(state, {
      principalPaid: monthlyMortgageResult.principalPaid,
      freedUpFromMortgagePayment: monthlyMortgageResult.freedUpFromMortgagePayment,
      actualMortgagePayment: monthlyMortgageResult.actualMortgagePayment,
      interestAccrued: monthlyMortgageResult.interestAccrued,
      interestSavedThisYear: monthlyMortgageResult.interestSavedThisYear,
    })

    const afterTaxInterest = inputs.isInvestmentProperty
      ? monthlyMortgageResult.interestAccrued * (1 - inputs.personalTaxRate)
      : monthlyMortgageResult.interestAccrued
    totalInterestPaid += afterTaxInterest
    totalInterestSaved += monthlyMortgageResult.interestSavedThisYear

    // Calculate tax refund from interest payments (for investment properties)
    const taxRefundFromInterest = inputs.isInvestmentProperty
      ? monthlyMortgageResult.interestAccrued * inputs.personalTaxRate
      : 0

    cumulativeMortgagePayments += monthlyMortgagePayment
    if (startState.mortgageBalance > 0) {
      actualMortgagePaymentsTotal += monthlyMortgageResult.actualMortgagePayment
    } else {
      mortgagePaymentsAfterPayoff += monthlyMortgagePayment
    }

    state = strategy.handleMortgagePayoff(state)
    state = strategy.handleExcessOffset(state)

    // Calculate growth on investment value BEFORE adding new contributions
    // handleExcessOffset is called before growth so offset moved to investments can earn growth
    const investmentValueBeforeContributions = state.investmentValue
    const growth = calculateInvestmentGrowth(investmentValueBeforeContributions, monthlyInputs)
    // Growth is calculated on annual basis, so divide by 12 for monthly
    const monthlyGrowth = {
      yearCapitalGain: growth.yearCapitalGain / 12,
      yearDividends: growth.yearDividends / 12,
      yearDividendTax: growth.yearDividendTax / 12,
      afterTaxDividends: growth.afterTaxDividends / 12,
    }
    
    cumulativeCapitalGain += monthlyGrowth.yearCapitalGain
    cumulativeDividendTax += monthlyGrowth.yearDividendTax
    totalAfterTaxDividends += monthlyGrowth.afterTaxDividends
    state.investmentValue += monthlyGrowth.yearCapitalGain + monthlyGrowth.afterTaxDividends
    state.investmentCostBasis += monthlyGrowth.afterTaxDividends

    // Add tax refund to contributions - it should be allocated according to the strategy
    const contributionWithTaxRefund = monthlyContribution + taxRefundFromInterest
    const contextWithTaxRefund: StrategyContext = {
      ...context,
      annualContribution: contributionWithTaxRefund * 12,
    }
    const contributionAllocation = strategy.allocateContributions(state, contextWithTaxRefund, inputs.splitRatio, inputs.switchYears)
    const monthlyContributionAllocation = {
      contributionToOffset: contributionAllocation.contributionToOffset / 12,
      contributionToInvestment: contributionAllocation.contributionToInvestment / 12,
    }

    if (contributionWithTaxRefund > 0) {
      state.offsetBalance += monthlyContributionAllocation.contributionToOffset
      state.offsetTotalInvested += monthlyContributionAllocation.contributionToOffset
      state.investmentValue += monthlyContributionAllocation.contributionToInvestment
      state.investmentCostBasis += monthlyContributionAllocation.contributionToInvestment
    }
    actualInvestmentContributions += monthlyContributionAllocation.contributionToInvestment

    if (monthlyMortgageResult.freedUpFromMortgagePayment > 0) {
      state.investmentValue += monthlyMortgageResult.freedUpFromMortgagePayment
      state.investmentCostBasis += monthlyMortgageResult.freedUpFromMortgagePayment
      freedUpMortgagePaymentsTotal += monthlyMortgageResult.freedUpFromMortgagePayment
      actualInvestmentContributions += monthlyMortgageResult.freedUpFromMortgagePayment
    }

    const investmentValueBeforeGrowth = investmentValueBeforeContributions
    const taxes = calculateTaxes(
      state.investmentValue,
      state.investmentCostBasis,
      cumulativeDividendTax,
      inputs
    )

    // Net worth after CGT (assuming gradual selling to stay in personal tax bracket)
    const netWorth = state.investmentValue - taxes.capitalGainsTax + state.offsetBalance - state.mortgageBalance

    const offsetMovedToInvestments = Math.max(
      0,
      startState.offsetBalance + monthlyContributionAllocation.contributionToOffset - state.offsetBalance
    )
    const netOffsetContribution = monthlyContributionAllocation.contributionToOffset - offsetMovedToInvestments

    // Calculate how much of the tax refund went to offset vs investments
    let taxRefundToOffset = 0
    let taxRefundToInvestment = 0
    if (taxRefundFromInterest > 0 && contributionWithTaxRefund > 0) {
      const taxRefundProportionToOffset = monthlyContributionAllocation.contributionToOffset / contributionWithTaxRefund
      const taxRefundProportionToInvestment = monthlyContributionAllocation.contributionToInvestment / contributionWithTaxRefund
      taxRefundToOffset = taxRefundFromInterest * taxRefundProportionToOffset
      taxRefundToInvestment = taxRefundFromInterest * taxRefundProportionToInvestment
    }

    results.push({
      month,
      year,
      mortgageBalance: state.mortgageBalance,
      previousMortgageBalance: startState.mortgageBalance,
      mortgageInterest: monthlyMortgageResult.interestAccrued,
      mortgagePayment: monthlyMortgageResult.actualMortgagePayment,
      principalPaid: monthlyMortgageResult.principalPaid,
      offsetBalance: state.offsetBalance,
      previousOffsetBalance: startState.offsetBalance,
      offsetContribution: netOffsetContribution,
      investmentValue: state.investmentValue,
      previousInvestmentValue: investmentValueBeforeGrowth,
      capitalGains: monthlyGrowth.yearCapitalGain,
      dividends: monthlyGrowth.yearDividends,
      capitalGainsTax: taxes.capitalGainsTax,
      capitalGainsTaxBeforeDiscount: taxes.capitalGainsTaxBeforeDiscount,
      capitalGainsDiscount: taxes.capitalGainsDiscount,
      dividendTax: monthlyGrowth.yearDividendTax,
      investmentContribution: monthlyContributionAllocation.contributionToInvestment + monthlyMortgageResult.freedUpFromMortgagePayment + offsetMovedToInvestments,
      netWorth: netWorth,
      totalReturn: cumulativeCapitalGain + totalAfterTaxDividends,
      interestPaid: totalInterestPaid,
      interestSaved: totalInterestSaved,
      totalTax: taxes.totalTax,
      offsetTotalInvested: state.offsetTotalInvested,
      investmentTotalInvested: state.investmentCostBasis,
      actualInvestmentContributions: actualInvestmentContributions,
      freedUpMortgagePaymentsTotal: freedUpMortgagePaymentsTotal,
      offsetNetGains: totalInterestSaved,
      investmentNetGains: cumulativeCapitalGain + totalAfterTaxDividends,
      outstandingBalanceForInterest: Math.max(0, startState.mortgageBalance - Math.min(startState.offsetBalance, startState.mortgageBalance)),
      cumulativeMortgagePayments: cumulativeMortgagePayments,
      actualMortgagePaymentsTotal: actualMortgagePaymentsTotal,
      mortgagePaymentsAfterPayoff: mortgagePaymentsAfterPayoff,
      taxRefundFromInterest: taxRefundFromInterest,
      taxRefundToOffset: taxRefundToOffset,
      taxRefundToInvestment: taxRefundToInvestment,
    })
  }

  return results
}

export function calculateComparisonMonthly(
  inputs: CalculationInputs, 
  leftStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' = 'allOffset',
  rightStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' = 'allInvestment',
  maxYearsOverride?: number
): {
  left: MonthResult[]
  right: MonthResult[]
  leftStrategy: string
  rightStrategy: string
} {
  const leftInputs = { ...inputs, strategy: leftStrategy as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' }
  const rightInputs = { ...inputs, strategy: rightStrategy as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove' }

  const maxYears = maxYearsOverride || inputs.years

  const left = calculateStrategyMonthly(leftInputs, maxYears)
  const right = calculateStrategyMonthly(rightInputs, maxYears)

  return {
    left,
    right,
    leftStrategy: leftStrategy,
    rightStrategy: rightStrategy,
  }
}

export function findOptimalSplit(
  inputs: CalculationInputs,
  year: number,
  step = 0.05
): {
  bestRatio: number
  bestNetWorth: number
  allOffsetNetWorth: number
  allInvestmentNetWorth: number
} {
  const clampedStep = Math.min(1, Math.max(0.01, step))
  const steps = Math.round(1 / clampedStep)

  let bestRatio = 0
  let bestNetWorth = -Infinity

  for (let i = 0; i <= steps; i++) {
    const ratio = Math.min(1, i * clampedStep)
    const results = calculateStrategy({ ...inputs, strategy: 'split', splitRatio: ratio }, year)
    const netWorth = getNetWorthAtYear(results, year)
    if (netWorth > bestNetWorth) {
      bestNetWorth = netWorth
      bestRatio = ratio
    }
  }

  const allOffsetNetWorth = getNetWorthAtYear(
    calculateStrategy({ ...inputs, strategy: 'allOffset' }, year),
    year
  )
  const allInvestmentNetWorth = getNetWorthAtYear(
    calculateStrategy({ ...inputs, strategy: 'allInvestment' }, year),
    year
  )

  return {
    bestRatio,
    bestNetWorth,
    allOffsetNetWorth,
    allInvestmentNetWorth,
  }
}
