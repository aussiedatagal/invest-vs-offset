export interface CalculationInputs {
  initialAmount: number
  weeklyContribution: number
  mortgageBalance: number
  mortgageInterestRate: number
  mortgagePayment?: number
  investmentReturnRate: number
  dividendYield: number
  capitalGainsRate: number
  personalTaxRate: number
  isInvestmentProperty: boolean
  years: number
  strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  splitRatio?: number
  switchYears?: number
}

export interface InvestmentBreakdown {
  capitalGrowth: number
  dividends: number
  capitalGainsTax: number
  dividendTax: number
  interestOnMortgage: number
  netBenefit: number
}

export interface OffsetBreakdown {
  interestSaved: number
  netBenefit: number
}

export interface YearResult {
  year: number
  mortgageBalance: number
  previousMortgageBalance: number
  mortgageInterest: number
  mortgagePayment: number
  principalPaid: number
  offsetBalance: number
  previousOffsetBalance: number
  offsetContribution: number
  investmentValue: number
  previousInvestmentValue: number
  capitalGains: number
  dividends: number
  capitalGainsTax: number
  capitalGainsTaxBeforeDiscount: number
  capitalGainsDiscount: number
  dividendTax: number
  investmentContribution: number
  netWorth: number
  totalReturn: number
  interestPaid: number
  interestSaved: number
  totalTax: number
  offsetTotalInvested: number
  investmentTotalInvested: number
  actualInvestmentContributions: number
  freedUpMortgagePaymentsTotal: number
  offsetNetGains: number
  investmentNetGains: number
  outstandingBalanceForInterest: number
  cumulativeMortgagePayments: number
  actualMortgagePaymentsTotal: number
  mortgagePaymentsAfterPayoff: number
  taxRefundFromInterest: number
  taxRefundToOffset?: number
  taxRefundToInvestment?: number
}

export interface MonthResult {
  month: number
  year: number
  mortgageBalance: number
  previousMortgageBalance: number
  mortgageInterest: number
  mortgagePayment: number
  principalPaid: number
  offsetBalance: number
  previousOffsetBalance: number
  offsetContribution: number
  investmentValue: number
  previousInvestmentValue: number
  capitalGains: number
  dividends: number
  capitalGainsTax: number
  capitalGainsTaxBeforeDiscount: number
  capitalGainsDiscount: number
  dividendTax: number
  investmentContribution: number
  netWorth: number
  totalReturn: number
  interestPaid: number
  interestSaved: number
  totalTax: number
  offsetTotalInvested: number
  investmentTotalInvested: number
  actualInvestmentContributions: number
  freedUpMortgagePaymentsTotal: number
  offsetNetGains: number
  investmentNetGains: number
  outstandingBalanceForInterest: number
  cumulativeMortgagePayments: number
  actualMortgagePaymentsTotal: number
  mortgagePaymentsAfterPayoff: number
  taxRefundFromInterest: number
  taxRefundToOffset: number
  taxRefundToInvestment: number
}

export interface CalculationResult {
  inputs: CalculationInputs
  results: YearResult[]
}

