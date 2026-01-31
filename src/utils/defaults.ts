import { CalculationInputs } from '../types'

export const defaultInputs: CalculationInputs = {
  initialAmount: 100000,
  weeklyContribution: 250,
  mortgageBalance: 800000,
  mortgageInterestRate: 0.055,
  investmentReturnRate: 0.075,
  dividendYield: 0,
  capitalGainsRate: 0.5,
  personalTaxRate: 0.325,
  isInvestmentProperty: false,
  years: 30,
  strategy: 'allOffset',
  splitRatio: 0.5,
  switchYears: 5,
}

export const inputLabels: Record<keyof CalculationInputs, string> = {
  initialAmount: 'Initial Amount ($)',
  weeklyContribution: 'Additional contributions (weekly)',
  mortgageBalance: 'Mortgage Balance ($)',
  mortgageInterestRate: 'Mortgage Interest Rate (%)',
  mortgagePayment: 'Annual Mortgage Payment ($)',
  investmentReturnRate: 'Investment Return Rate (%)',
  dividendYield: 'Dividend Yield (%)',
  capitalGainsRate: 'Capital Gains Discount (%)',
  personalTaxRate: 'Personal Tax Rate (%)',
  isInvestmentProperty: 'Investment Property (tax deductible interest)',
  years: 'Period (years)',
  strategy: 'Strategy',
  splitRatio: 'Offset/Investment Split Ratio',
  switchYears: 'Switch to Investment After (years)',
}

export const inputDescriptions: Record<keyof CalculationInputs, string> = {
  initialAmount: 'The amount of money you have to invest or offset initially',
  weeklyContribution: 'Amount you can contribute weekly to offset/investment on top of your mortgage responsibilities',
  mortgageBalance: 'Your current mortgage balance',
  mortgageInterestRate: 'Annual interest rate on your mortgage',
  mortgagePayment: 'Annual mortgage payment amount (calculated automatically)',
  investmentReturnRate: 'Expected annual return from investments (capital growth)',
  dividendYield: 'Expected annual dividend yield from investments',
  capitalGainsRate: 'Capital gains discount rate (typically 50% in Australia)',
  personalTaxRate: 'Your marginal tax rate (including Medicare levy)',
  isInvestmentProperty: 'Whether the mortgage interest is tax deductible (investment property)',
  years: 'Loan period in years (mortgage payment calculated to pay off loan in this period)',
  strategy: 'Strategy: All Offset, All Investment, Split, Offset Then Investment, or Offset Then Invest (move offset balance)',
  splitRatio: 'If split strategy: proportion of money going to offset (0-1). E.g., 0.5 = 50% to offset, 50% to investments. Only applies up to mortgage balance limit.',
  switchYears: 'If offset then investment strategy: number of years to use offset before switching to investments',
}

