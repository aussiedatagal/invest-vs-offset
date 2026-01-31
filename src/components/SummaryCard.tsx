import { CalculationInputs } from '../types'
import { calculateComparison } from '../utils/calculations'
import { getStrategy } from '../utils/strategies'

interface SummaryCardProps {
  comparison: ReturnType<typeof calculateComparison>
  inputs: CalculationInputs
  leftStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  rightStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  splitRatio: number
  switchYears: number
  timePeriod: number | null
  onLeftStrategyChange: (strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove') => void
  onRightStrategyChange: (strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove') => void
  onSplitRatioChange: (ratio: number) => void
  onSwitchYearsChange: (years: number) => void
  onTimePeriodChange: (years: number | null) => void
}

const getStrategyName = (strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove', splitRatio?: number, switchYears?: number): string => {
  if (strategy === 'allOffset') return 'Prioritise offset'
  if (strategy === 'allInvestment') return 'Prioritise investments'
  if (strategy === 'offsetThenInvestment') return `Offset for ${switchYears || 5} years then invest`
  if (strategy === 'offsetThenInvestmentMove') return `Offset for ${switchYears || 5} years then invest (move offset balance)`
  return `Split between offset and investments (${Math.round((splitRatio || 0.5) * 100)}% offset)`
}

const getStrategyDescription = (strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove', splitRatio?: number, switchYears?: number): string => {
  if (strategy === 'allOffset') {
    return 'Initial amount goes to offset (up to mortgage balance). Additional contributions go to offset until fully offset, then to investments. Mortgage payments go to mortgage until paid off, then to investments.'
  }
  if (strategy === 'allInvestment') {
    return 'Initial amount goes to investments. Additional contributions go to investments. Mortgage payments go to mortgage until paid off, then to investments.'
  }
  if (strategy === 'offsetThenInvestment') {
    return `Initial amount goes to offset (up to mortgage balance). Additional contributions go to offset for ${switchYears || 5} years, then switch to investments. Mortgage payments go to mortgage until paid off, then to investments.`
  }
  if (strategy === 'offsetThenInvestmentMove') {
    return `Initial amount goes to offset (up to mortgage balance). Additional contributions go to offset for ${switchYears || 5} years, then the offset balance is moved into investments and contributions stay invested. Mortgage payments go to mortgage until paid off, then to investments.`
  }
  const offsetPercent = Math.round((splitRatio || 0.5) * 100)
  const investPercent = 100 - offsetPercent
  return `Initial amount is split ${offsetPercent}% offset, ${investPercent}% investments. Additional contributions are split the same way until fully offset, then go to investments. Mortgage payments go to mortgage until paid off, then to investments.`
}

export function SummaryCard({ 
  comparison, 
  inputs, 
  leftStrategy, 
  rightStrategy, 
  splitRatio,
  switchYears,
  timePeriod,
  onLeftStrategyChange,
  onRightStrategyChange,
  onSplitRatioChange,
  onSwitchYearsChange,
  onTimePeriodChange
}: SummaryCardProps) {
  // Use the same extended comparison logic as the graph to ensure consistency
  const maxYear = comparison.left.length > 0 
    ? Math.max(...comparison.left.map(d => d.year)) 
    : inputs.years
  const maxXAxisDomain = Math.ceil(maxYear / 5) * 5
  const inputsWithStrategyParams = { ...inputs, splitRatio, switchYears }
  // Recalculate with extended years to continue growth to the rounded domain, but respect timePeriod if set
  const extendedComparison = maxYear < maxXAxisDomain && !timePeriod
    ? calculateComparison(inputsWithStrategyParams, leftStrategy, rightStrategy, maxXAxisDomain)
    : comparison
  
  const actualTimeFrame = extendedComparison.left.length > 0 ? extendedComparison.left[extendedComparison.left.length - 1].year : inputs.years
  const displayTimeFrame = timePeriod || actualTimeFrame
  // Get the data for the selected time period, or use the last available year
  const leftFinal = extendedComparison.left.find(r => r.year === displayTimeFrame) || extendedComparison.left[extendedComparison.left.length - 1]
  const rightFinal = extendedComparison.right.find(r => r.year === displayTimeFrame) || extendedComparison.right[extendedComparison.right.length - 1]
  // Slider max: 50 if calculated max <= 50, otherwise calculated max + 20
  const calculatedMax = Math.max(inputs.years, actualTimeFrame)
  const maxYears = calculatedMax > 50 ? calculatedMax + 20 : 50

  const initialAmount = inputs.initialAmount
  const initialLoan = inputs.mortgageBalance
  
  // Mortgage payments = actual payments made to mortgage (principal + interest paid)
  // For offset strategy, this will be less because mortgage is paid off faster (less interest)
  // The money that would have been paid into mortgage goes to investments instead
  // Total payments = interest paid + principal paid (which is initial balance - final balance)
  const leftTotalMortgagePayments = leftFinal.interestPaid + (inputs.mortgageBalance - leftFinal.mortgageBalance)
  const rightTotalMortgagePayments = rightFinal.interestPaid + (inputs.mortgageBalance - rightFinal.mortgageBalance)
  
  const leftTotalInterest = leftFinal.interestPaid
  const rightTotalInterest = rightFinal.interestPaid
  
  // Calculate how much of the tax refund went to offset vs investments
  const leftTotalTaxRefundToInvestment = extendedComparison.left.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + (r.taxRefundToInvestment || 0), 0)
  const rightTotalTaxRefundToInvestment = extendedComparison.right.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + (r.taxRefundToInvestment || 0), 0)
  
  // Calculate initial amount allocation for each strategy
  const leftStrategyObj = getStrategy({ ...inputs, strategy: leftStrategy })
  const rightStrategyObj = getStrategy({ ...inputs, strategy: rightStrategy })
  const leftInitialAllocation = leftStrategyObj.allocateInitialAmount(initialAmount, inputs.mortgageBalance, inputs.splitRatio, inputs.switchYears)
  const rightInitialAllocation = rightStrategyObj.allocateInitialAmount(initialAmount, inputs.mortgageBalance, inputs.splitRatio, inputs.switchYears)
  
  // Calculate how much offset was moved to investments and split it between initial amount, additional contributions, and tax refunds
  // When offset is moved, it should first fill up the initial amount portion, then additional contributions, then tax refunds
  let leftOffsetMovedInitial = 0
  let leftOffsetMovedAdditional = 0
  let leftOffsetMovedTaxRefund = 0
  let rightOffsetMovedInitial = 0
  let rightOffsetMovedAdditional = 0
  let rightOffsetMovedTaxRefund = 0
  
  // Track how much of the initial offset allocation is still in offset (not yet moved)
  let leftRemainingInitialInOffset = leftInitialAllocation.offsetAllocation
  let rightRemainingInitialInOffset = rightInitialAllocation.offsetAllocation
  
  // Track cumulative tax refund that went to offset (to calculate proportions)
  let leftCumulativeTaxRefundToOffset = 0
  let rightCumulativeTaxRefundToOffset = 0
  
  for (const result of extendedComparison.left.filter(r => r.year <= displayTimeFrame)) {
    const previousOffsetBalance = result.previousOffsetBalance || 0
    const currentOffsetBalance = result.offsetBalance
    const offsetMoved = Math.max(0, previousOffsetBalance - currentOffsetBalance)
    
    // Track tax refund that went to offset this year
    const taxRefundToOffsetThisYear = result.taxRefundToOffset || 0
    leftCumulativeTaxRefundToOffset += taxRefundToOffsetThisYear
    
    if (offsetMoved > 0 && previousOffsetBalance > 0) {
      // Calculate proportions based on what's in the offset balance
      // The offset balance consists of: initial amount, additional contributions, and tax refunds
      const initialPortionInOffset = Math.min(leftRemainingInitialInOffset, previousOffsetBalance)
      const nonInitialPortion = Math.max(0, previousOffsetBalance - initialPortionInOffset)
      
      // Calculate proportion of non-initial portion that is from tax refunds
      // Use offsetTotalInvested to estimate: tax refund proportion = cumulative tax refund / (total invested - initial)
      const totalNonInitialInvested = Math.max(0, result.offsetTotalInvested - leftInitialAllocation.offsetAllocation)
      const taxRefundProportion = totalNonInitialInvested > 0 && leftCumulativeTaxRefundToOffset > 0
        ? Math.min(1, leftCumulativeTaxRefundToOffset / totalNonInitialInvested)
        : 0
      const taxRefundPortionInOffset = nonInitialPortion * taxRefundProportion
      const additionalPortionInOffset = nonInitialPortion - taxRefundPortionInOffset
      
      // Allocate moved offset: first from initial amount, then from additional, then from tax refunds
      const movedInitial = Math.min(offsetMoved, initialPortionInOffset)
      const remainingAfterInitialMove = offsetMoved - movedInitial
      const movedAdditional = Math.min(remainingAfterInitialMove, additionalPortionInOffset)
      const movedTaxRefund = remainingAfterInitialMove - movedAdditional
      
      leftOffsetMovedInitial += movedInitial
      leftOffsetMovedAdditional += movedAdditional
      leftOffsetMovedTaxRefund += movedTaxRefund
      
      leftRemainingInitialInOffset = Math.max(0, leftRemainingInitialInOffset - movedInitial)
      // Reduce cumulative tax refund by what was moved (proportionally)
      if (movedTaxRefund > 0 && taxRefundPortionInOffset > 0) {
        leftCumulativeTaxRefundToOffset = Math.max(0, leftCumulativeTaxRefundToOffset - (movedTaxRefund * (leftCumulativeTaxRefundToOffset / taxRefundPortionInOffset)))
      }
    }
  }
  
  for (const result of extendedComparison.right.filter(r => r.year <= displayTimeFrame)) {
    const previousOffsetBalance = result.previousOffsetBalance || 0
    const currentOffsetBalance = result.offsetBalance
    const offsetMoved = Math.max(0, previousOffsetBalance - currentOffsetBalance)
    
    // Track tax refund that went to offset this year
    const taxRefundToOffsetThisYear = result.taxRefundToOffset || 0
    rightCumulativeTaxRefundToOffset += taxRefundToOffsetThisYear
    
    if (offsetMoved > 0 && previousOffsetBalance > 0) {
      // Calculate proportions based on what's in the offset balance
      const initialPortionInOffset = Math.min(rightRemainingInitialInOffset, previousOffsetBalance)
      const nonInitialPortion = Math.max(0, previousOffsetBalance - initialPortionInOffset)
      const taxRefundProportion = nonInitialPortion > 0 && rightCumulativeTaxRefundToOffset > 0
        ? Math.min(1, rightCumulativeTaxRefundToOffset / (result.offsetTotalInvested - rightInitialAllocation.offsetAllocation))
        : 0
      const taxRefundPortionInOffset = nonInitialPortion * taxRefundProportion
      const additionalPortionInOffset = nonInitialPortion - taxRefundPortionInOffset
      
      // Allocate moved offset: first from initial amount, then from additional, then from tax refunds
      const movedInitial = Math.min(offsetMoved, initialPortionInOffset)
      const remainingAfterInitialMove = offsetMoved - movedInitial
      const movedAdditional = Math.min(remainingAfterInitialMove, additionalPortionInOffset)
      const movedTaxRefund = remainingAfterInitialMove - movedAdditional
      
      rightOffsetMovedInitial += movedInitial
      rightOffsetMovedAdditional += movedAdditional
      rightOffsetMovedTaxRefund += movedTaxRefund
      
      rightRemainingInitialInOffset = Math.max(0, rightRemainingInitialInOffset - movedInitial)
      // Reduce cumulative tax refund by what was moved (proportionally)
      if (movedTaxRefund > 0 && taxRefundPortionInOffset > 0) {
        rightCumulativeTaxRefundToOffset = Math.max(0, rightCumulativeTaxRefundToOffset - (movedTaxRefund * (rightCumulativeTaxRefundToOffset / taxRefundPortionInOffset)))
      }
    }
  }
  
  // Initial amount in investments = initial allocation to investments + offset moved from initial amount
  const leftInitialAmountInInvestments = leftInitialAllocation.investmentAllocation + leftOffsetMovedInitial
  const rightInitialAmountInInvestments = rightInitialAllocation.investmentAllocation + rightOffsetMovedInitial
  
  // Additional contributions = total investment contributions - tax refunds to investments - offset moved from additional contributions
  // (offset moved from additional contributions is already included in investmentContribution, but we need to account for it separately)
  // Actually, we need to subtract the offset moved from additional contributions from the total, then add it back as "additional contributions"
  // Wait, the investmentContribution already includes offsetMovedToInvestments. We need to:
  // 1. Subtract offsetMovedToInvestments from investmentContribution (to get direct contributions)
  // 2. Add back offsetMovedInitial as part of initial amount (already done above)
  // 3. Add back offsetMovedAdditional as part of additional contributions
  const leftDirectInvestmentContributions = extendedComparison.left.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => {
    const offsetMoved = Math.max(0, (r.previousOffsetBalance || 0) - r.offsetBalance)
    return sum + r.investmentContribution - offsetMoved
  }, 0)
  const rightDirectInvestmentContributions = extendedComparison.right.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => {
    const offsetMoved = Math.max(0, (r.previousOffsetBalance || 0) - r.offsetBalance)
    return sum + r.investmentContribution - offsetMoved
  }, 0)
  
  // Additional contributions = direct contributions - tax refunds + offset moved from additional contributions
  const leftAdditionalContributions = leftDirectInvestmentContributions - leftTotalTaxRefundToInvestment + leftOffsetMovedAdditional
  const rightAdditionalContributions = rightDirectInvestmentContributions - rightTotalTaxRefundToInvestment + rightOffsetMovedAdditional
  
  // Calculate cumulative dividends and dividend tax (only up to displayTimeFrame)
  const leftTotalDividends = extendedComparison.left.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.dividends, 0)
  const rightTotalDividends = extendedComparison.right.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.dividends, 0)
  const leftTotalDividendTax = extendedComparison.left.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.dividendTax, 0)
  const rightTotalDividendTax = extendedComparison.right.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.dividendTax, 0)
  
  // Calculate cumulative capital gains (only up to displayTimeFrame)
  const leftTotalCapitalGains = extendedComparison.left.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.capitalGains, 0)
  const rightTotalCapitalGains = extendedComparison.right.filter(r => r.year <= displayTimeFrame).reduce((sum, r) => sum + r.capitalGains, 0)
  
  // Capital gains tax (deducted from net worth, assuming gradual selling to stay in personal tax bracket)
  const leftCapitalGainsTax = leftFinal.capitalGainsTax
  const rightCapitalGainsTax = rightFinal.capitalGainsTax

  // Net worth already includes CGT deduction in calculations.ts
  const leftNetWorth = leftFinal.netWorth
  const rightNetWorth = rightFinal.netWorth
  
  const getColorClasses = (color: string) => {
    if (color === 'green') return 'bg-orange-50 text-orange-900 border-orange-200'
    if (color === 'blue') return 'bg-blue-50 text-blue-900 border-blue-200'
    return 'bg-purple-50 text-purple-900 border-purple-200'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-700 font-medium">
            Results after <span className="text-gray-900">{displayTimeFrame}</span> {displayTimeFrame === 1 ? 'year' : 'years'}
          </p>
          <span className="text-xs text-gray-500">{displayTimeFrame} years</span>
        </div>
        <input
          type="range"
          min="1"
          max={maxYears}
          value={displayTimeFrame}
          onChange={(e) => onTimePeriodChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 year</span>
          <span>{maxYears} years</span>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Strategy A</label>
            <select
              value={leftStrategy}
              onChange={(e) => onLeftStrategyChange(e.target.value as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove')}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="allOffset">Prioritise offset</option>
              <option value="allInvestment">Prioritise investments</option>
              <option value="split">Split between offset and investments</option>
              <option value="offsetThenInvestment">Offset for X years then invest</option>
              <option value="offsetThenInvestmentMove">Offset for X years then invest (move offset balance)</option>
            </select>
            {leftStrategy === 'split' && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Offset Ratio</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={splitRatio}
                  onChange={(e) => {
                    const nextValue = parseFloat(e.target.value)
                    if (Number.isNaN(nextValue) || nextValue < 0 || nextValue > 1) {
                      return
                    }
                    onSplitRatioChange(nextValue)
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
            {(leftStrategy === 'offsetThenInvestment' || leftStrategy === 'offsetThenInvestmentMove') && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Switch Years</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={switchYears}
                  onChange={(e) => {
                    const nextValue = parseInt(e.target.value, 10)
                    if (Number.isNaN(nextValue) || nextValue < 1 || nextValue > 100) {
                      return
                    }
                    onSwitchYearsChange(nextValue)
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-orange-900 mb-2">
              {getStrategyName(leftStrategy, splitRatio, switchYears)}
            </h4>
            <p className="text-xs text-gray-600 italic">
              {getStrategyDescription(leftStrategy, splitRatio, switchYears)}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Strategy B</label>
            <select
              value={rightStrategy}
              onChange={(e) => onRightStrategyChange(e.target.value as 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove')}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="allOffset">Prioritise offset</option>
              <option value="allInvestment">Prioritise investments</option>
              <option value="split">Split between offset and investments</option>
              <option value="offsetThenInvestment">Offset for X years then invest</option>
              <option value="offsetThenInvestmentMove">Offset for X years then invest (move offset balance)</option>
            </select>
            {rightStrategy === 'split' && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Offset Ratio</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={splitRatio}
                  onChange={(e) => {
                    const nextValue = parseFloat(e.target.value)
                    if (Number.isNaN(nextValue) || nextValue < 0 || nextValue > 1) {
                      return
                    }
                    onSplitRatioChange(nextValue)
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
            {(rightStrategy === 'offsetThenInvestment' || rightStrategy === 'offsetThenInvestmentMove') && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Switch Years</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={switchYears}
                  onChange={(e) => {
                    const nextValue = parseInt(e.target.value, 10)
                    if (Number.isNaN(nextValue) || nextValue < 1 || nextValue > 100) {
                      return
                    }
                    onSwitchYearsChange(nextValue)
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              {getStrategyName(rightStrategy, splitRatio, switchYears)}
            </h4>
            <p className="text-xs text-gray-600 italic">
              {getStrategyDescription(rightStrategy, splitRatio, switchYears)}
            </p>
          </div>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-4 text-sm">
            {/* Mortgage Section */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Mortgage:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">- Loan:</span>
                  <span className="text-red-600">-${Math.round(initialLoan).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Interest:</span>
                  <span className="text-red-600">-${Math.round(leftTotalInterest).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Mortgage Payments:</span>
                  <span className="text-green-600">+${Math.round(leftTotalMortgagePayments).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Mortgage Balance:</span>
                  <span className={`${leftFinal.mortgageBalance <= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    ${Math.round(leftFinal.mortgageBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Investments Section */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Investments:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Initial Amount:</span>
                  <span className="text-green-600">+${Math.round(leftInitialAmountInInvestments).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Additional contributions:</span>
                  <span className="text-green-600">+${Math.round(leftAdditionalContributions).toLocaleString()}</span>
                </div>
                {(leftTotalTaxRefundToInvestment + leftOffsetMovedTaxRefund > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">+ Tax refund from interest:</span>
                    <span className="text-green-600">+${Math.round(leftTotalTaxRefundToInvestment + leftOffsetMovedTaxRefund).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Dividends:</span>
                  <span className="text-green-600">+${Math.round(leftTotalDividends).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Dividend Tax:</span>
                  <span className="text-red-600">-${Math.round(leftTotalDividendTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Capital Gains:</span>
                  <span className="text-green-600">+${Math.round(leftTotalCapitalGains).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Capital Gains Tax:</span>
                  <span className="text-red-600">-${Math.round(leftCapitalGainsTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 italic pl-2">
                  <span>(assumes gradual selling to stay in personal tax bracket)</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Investment Balance (post-tax):</span>
                  <span className="text-green-600">
                    ${Math.round(leftFinal.investmentValue - leftCapitalGainsTax).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Worth */}
            <div className="pt-3 border-t-2 border-gray-400">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Net Worth (excludes property value):</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">- Mortgage Balance:</span>
                  <span className="text-red-600">-${Math.round(leftFinal.mortgageBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">+ Offset Balance:</span>
                  <span className="text-green-600">+${Math.round(leftFinal.offsetBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">+ Investment Balance (post-tax):</span>
                  <span className="text-green-600">+${Math.round(leftFinal.investmentValue - leftCapitalGainsTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Total Net Worth:</span>
                  <span className={`${leftNetWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.round(leftNetWorth).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-4 text-sm">
            {/* Mortgage Section */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Mortgage:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">- Loan:</span>
                  <span className="text-red-600">-${Math.round(initialLoan).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Interest:</span>
                  <span className="text-red-600">-${Math.round(rightTotalInterest).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Mortgage Payments:</span>
                  <span className="text-green-600">+${Math.round(rightTotalMortgagePayments).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Mortgage Balance:</span>
                  <span className={`${rightFinal.mortgageBalance <= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    ${Math.round(rightFinal.mortgageBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Investments Section */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Investments:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Initial Amount:</span>
                  <span className="text-green-600">+${Math.round(rightInitialAmountInInvestments).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Additional contributions:</span>
                  <span className="text-green-600">+${Math.round(rightAdditionalContributions).toLocaleString()}</span>
                </div>
                {(rightTotalTaxRefundToInvestment + rightOffsetMovedTaxRefund > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">+ Tax refund from interest:</span>
                    <span className="text-green-600">+${Math.round(rightTotalTaxRefundToInvestment + rightOffsetMovedTaxRefund).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Dividends:</span>
                  <span className="text-green-600">+${Math.round(rightTotalDividends).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Dividend Tax:</span>
                  <span className="text-red-600">-${Math.round(rightTotalDividendTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Capital Gains:</span>
                  <span className="text-green-600">+${Math.round(rightTotalCapitalGains).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Capital Gains Tax:</span>
                  <span className="text-red-600">-${Math.round(rightCapitalGainsTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 italic pl-2">
                  <span>(assumes gradual selling to stay in personal tax bracket)</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Investment Balance (post-tax):</span>
                  <span className="text-green-600">
                    ${Math.round(rightFinal.investmentValue - rightCapitalGainsTax).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Worth */}
            <div className="pt-3 border-t-2 border-gray-400">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Net Worth (excludes property value):</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">- Mortgage Balance:</span>
                  <span className="text-red-600">-${Math.round(rightFinal.mortgageBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">+ Offset Balance:</span>
                  <span className="text-green-600">+${Math.round(rightFinal.offsetBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-gray-600">+ Investment Balance (post-tax):</span>
                  <span className="text-green-600">+${Math.round(rightFinal.investmentValue - rightCapitalGainsTax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-gray-300 font-semibold">
                  <span className="text-gray-700">Total Net Worth:</span>
                  <span className={`${rightNetWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.round(rightNetWorth).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${getColorClasses('green')} rounded-lg p-4 border-2`}>
          <p className="text-lg font-semibold mb-1">Net Worth (excludes property value)</p>
          <p className="text-2xl font-bold">
            ${Math.round(leftNetWorth).toLocaleString()}
          </p>
        </div>
        <div className={`${getColorClasses('blue')} rounded-lg p-4 border-2`}>
          <p className="text-lg font-semibold mb-1">Net Worth (excludes property value)</p>
          <p className="text-2xl font-bold">
            ${Math.round(rightNetWorth).toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Property value is excluded because it is the same in both scenarios and does not change the comparison, so
        we do not collect it. Capital gains tax is deducted from net worth assuming gradual selling to stay within your personal tax bracket (not selling all at once which could push you into higher brackets).
      </p>
    </div>
  )
}
