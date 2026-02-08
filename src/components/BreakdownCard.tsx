import { useMemo } from 'react'
import { calculateComparison } from '../utils/calculations'
import { CalculationInputs } from '../types'

interface BreakdownCardProps {
  comparison: ReturnType<typeof calculateComparison>
  inputs: CalculationInputs
  leftStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  rightStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  splitRatio: number
  switchYears: number
  timePeriod: number | null
}

const getStrategyName = (strategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove', splitRatio?: number, switchYears?: number): string => {
  if (strategy === 'allOffset') return 'Prioritise offset'
  if (strategy === 'allInvestment') return 'Prioritise investments'
  if (strategy === 'offsetThenInvestment') return `Offset for ${switchYears || 5} years then invest`
  if (strategy === 'offsetThenInvestmentMove') return `Offset for ${switchYears || 5} years then invest (move offset balance)`
  return `Split between offset and investments (${Math.round((splitRatio || 0.5) * 100)}% offset)`
}

export function BreakdownCard({ comparison, inputs, leftStrategy, rightStrategy, splitRatio, switchYears, timePeriod }: BreakdownCardProps) {
  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const inputsWithStrategyParams = { ...inputs, splitRatio, switchYears }

  const maxYear = comparison.left.length > 0 
    ? Math.max(...comparison.left.map(r => r.year)) 
    : 20
  const maxXAxisDomain = Math.ceil(maxYear / 5) * 5

  const extendedComparison = useMemo(() => {
    if (maxYear < maxXAxisDomain && !timePeriod) {
      return calculateComparison(inputsWithStrategyParams, leftStrategy, rightStrategy, maxXAxisDomain)
    }
    return comparison
  }, [maxYear, maxXAxisDomain, timePeriod, inputsWithStrategyParams, leftStrategy, rightStrategy, comparison])

  const leftName = getStrategyName(leftStrategy, splitRatio, switchYears)
  const rightName = getStrategyName(rightStrategy, splitRatio, switchYears)

  const displayData = {
    left: extendedComparison.left,
    right: extendedComparison.right,
    periods: extendedComparison.left.map(r => ({ period: r.year, year: r.year, label: `After ${r.year} ${r.year === 1 ? 'Year' : 'Years'}` }))
  }

  if (displayData.periods.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <div className="space-y-6">
        {displayData.periods.map(({ period, label }) => {
          const left = displayData.left.find(r => r.year === period)
          const right = displayData.right.find(r => r.year === period)
          
          if (!left || !right) return null

          return (
            <section key={period} className="border border-gray-200 rounded-lg bg-white p-4 sm:p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {label}
              </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 flex flex-col">
                    <h4 className="text-sm font-semibold text-green-900 border-b border-green-200 pb-2">
                      {leftName}
                    </h4>
                    <div className="space-y-2 text-sm flex-grow flex flex-col">
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Mortgage</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous balance:</span>
                            <span className="text-red-600">-{formatCurrency(left.previousMortgageBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Interest:</span>
                            <div className="flex flex-col items-end">
                              <span className="text-red-600">-{formatCurrency(left.mortgageInterest)}</span>
                              <span className="text-xs text-gray-500">
                                (on balance: {formatCurrency(left.outstandingBalanceForInterest)})
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment:</span>
                            <span className="text-green-600">+{formatCurrency(left.mortgagePayment)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Mortgage total:</span>
                            <span className="text-red-600">-{formatCurrency(left.mortgageBalance)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Offset</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous balance:</span>
                            <span className="text-green-600">{formatCurrency(left.previousOffsetBalance)}</span>
                          </div>
                          {left.offsetContribution > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+{formatCurrency(left.offsetContribution - (left.taxRefundToOffset ?? 0))}</span>
                              </div>
                              {(left.taxRefundToOffset ?? 0) > 0 ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tax refund on interest:</span>
                                  <span className="text-green-600">+{formatCurrency(left.taxRefundToOffset ?? 0)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between opacity-0">
                                  <span className="text-gray-600">Tax refund on interest:</span>
                                  <span className="text-green-600">+$0</span>
                                </div>
                              )}
                            </>
                          )}
                          {left.offsetContribution < 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Moved into investments:</span>
                              <span className="text-red-600">{formatCurrency(left.offsetContribution)}</span>
                            </div>
                          )}
                          {left.offsetContribution === 0 && (left.taxRefundToOffset ?? 0) === 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                              <div className="flex justify-between opacity-0">
                                <span className="text-gray-600">Tax refund on interest:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Offset total:</span>
                            <span className="text-green-600">{formatCurrency(left.offsetBalance)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Interest saved:</span>
                              <span className="text-gray-700">{formatCurrency(left.offsetNetGains)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Investments</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous value:</span>
                            <span className="text-green-600">{formatCurrency(left.previousInvestmentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dividends:</span>
                            <span className="text-green-600">+{formatCurrency(left.dividends)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dividend tax:</span>
                            <span className="text-red-600">-{formatCurrency(left.dividendTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Capital gains:</span>
                            <span className="text-green-600">+{formatCurrency(left.capitalGains)}</span>
                          </div>
                          {left.investmentContribution > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+{formatCurrency(left.investmentContribution - (left.taxRefundToInvestment ?? 0))}</span>
                              </div>
                              {(left.taxRefundToInvestment ?? 0) > 0 ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tax refund from interest:</span>
                                  <span className="text-green-600">+{formatCurrency(left.taxRefundToInvestment ?? 0)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between opacity-0">
                                  <span className="text-gray-600">Tax refund from interest:</span>
                                  <span className="text-green-600">+$0</span>
                                </div>
                              )}
                            </>
                          )}
                          {left.investmentContribution === 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                              <div className="flex justify-between opacity-0">
                                <span className="text-gray-600">Tax refund from interest:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Total investment value:</span>
                            <span className="text-green-600">{formatCurrency(left.investmentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CGT if sold:</span>
                            <span className="text-red-600">-{formatCurrency(left.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Investment balance:</span>
                            <span className="text-green-600">{formatCurrency(left.investmentValue - left.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total invested:</span>
                              <span className="text-gray-700">{formatCurrency(left.investmentTotalInvested)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Net gains:</span>
                              <span className="text-gray-700">{formatCurrency((left.investmentValue - left.capitalGainsTax) - left.investmentTotalInvested)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded mt-auto">
                        <div className="font-medium text-gray-700 mb-2">Net Worth (excludes property value)</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">- Mortgage Balance:</span>
                            <span className="text-red-600">-{formatCurrency(left.mortgageBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">+ Offset Balance:</span>
                            <span className="text-green-600">+{formatCurrency(left.offsetBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">+ Investment Balance (post-tax):</span>
                            <span className="text-green-600">+{formatCurrency(left.investmentValue - left.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t-2 border-gray-400 pt-1 mt-1 flex justify-between font-bold text-lg">
                            <span>Net worth:</span>
                            <span className={left.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(left.netWorth)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 flex flex-col">
                    <h4 className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-2">
                      {rightName}
                    </h4>
                    <div className="space-y-2 text-sm flex-grow flex flex-col">
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Mortgage</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous balance:</span>
                            <span className="text-red-600">-{formatCurrency(right.previousMortgageBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Interest:</span>
                            <div className="flex flex-col items-end">
                              <span className="text-red-600">-{formatCurrency(right.mortgageInterest)}</span>
                              <span className="text-xs text-gray-500">
                                (on balance: {formatCurrency(right.outstandingBalanceForInterest)})
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment:</span>
                            <span className="text-green-600">+{formatCurrency(right.mortgagePayment)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Mortgage total:</span>
                            <span className="text-red-600">-{formatCurrency(right.mortgageBalance)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Offset</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous balance:</span>
                            <span className="text-green-600">{formatCurrency(right.previousOffsetBalance)}</span>
                          </div>
                          {right.offsetContribution > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+{formatCurrency(right.offsetContribution - (right.taxRefundToOffset ?? 0))}</span>
                              </div>
                              {(right.taxRefundToOffset ?? 0) > 0 ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tax refund on interest:</span>
                                  <span className="text-green-600">+{formatCurrency(right.taxRefundToOffset ?? 0)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between opacity-0">
                                  <span className="text-gray-600">Tax refund on interest:</span>
                                  <span className="text-green-600">+$0</span>
                                </div>
                              )}
                            </>
                          )}
                          {right.offsetContribution < 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Moved into investments:</span>
                              <span className="text-red-600">{formatCurrency(right.offsetContribution)}</span>
                            </div>
                          )}
                          {right.offsetContribution === 0 && (right.taxRefundToOffset ?? 0) === 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                              <div className="flex justify-between opacity-0">
                                <span className="text-gray-600">Tax refund on interest:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Offset total:</span>
                            <span className="text-green-600">{formatCurrency(right.offsetBalance)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Interest saved:</span>
                              <span className="text-gray-700">{formatCurrency(right.offsetNetGains)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-700 mb-2">Investments</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Previous value:</span>
                            <span className="text-green-600">{formatCurrency(right.previousInvestmentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dividends:</span>
                            <span className="text-green-600">+{formatCurrency(right.dividends)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dividend tax:</span>
                            <span className="text-red-600">-{formatCurrency(right.dividendTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Capital gains:</span>
                            <span className="text-green-600">+{formatCurrency(right.capitalGains)}</span>
                          </div>
                          {right.investmentContribution > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+{formatCurrency(right.investmentContribution - (right.taxRefundToInvestment ?? 0))}</span>
                              </div>
                              {(right.taxRefundToInvestment ?? 0) > 0 ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tax refund from interest:</span>
                                  <span className="text-green-600">+{formatCurrency(right.taxRefundToInvestment ?? 0)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between opacity-0">
                                  <span className="text-gray-600">Tax refund from interest:</span>
                                  <span className="text-green-600">+$0</span>
                                </div>
                              )}
                            </>
                          )}
                          {right.investmentContribution === 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional contributions:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                              <div className="flex justify-between opacity-0">
                                <span className="text-gray-600">Tax refund from interest:</span>
                                <span className="text-green-600">+$0</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Total investment value:</span>
                            <span className="text-green-600">{formatCurrency(right.investmentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CGT if sold:</span>
                            <span className="text-red-600">-{formatCurrency(right.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Investment balance:</span>
                            <span className="text-green-600">{formatCurrency(right.investmentValue - right.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total invested:</span>
                              <span className="text-gray-700">{formatCurrency(right.investmentTotalInvested)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Net gains:</span>
                              <span className="text-gray-700">{formatCurrency((right.investmentValue - right.capitalGainsTax) - right.investmentTotalInvested)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded mt-auto">
                        <div className="font-medium text-gray-700 mb-2">Net Worth (excludes property value)</div>
                        <div className="space-y-1 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">- Mortgage Balance:</span>
                            <span className="text-red-600">-{formatCurrency(right.mortgageBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">+ Offset Balance:</span>
                            <span className="text-green-600">+{formatCurrency(right.offsetBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">+ Investment Balance (post-tax):</span>
                            <span className="text-green-600">+{formatCurrency(right.investmentValue - right.capitalGainsTax)}</span>
                          </div>
                          <div className="border-t-2 border-gray-400 pt-1 mt-1 flex justify-between font-bold text-lg">
                            <span>Net worth:</span>
                            <span className={right.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(right.netWorth)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
      </div>
    </div>
  )
}
