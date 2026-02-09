import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  ReferenceLine,
} from 'recharts'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { CalculationInputs } from '../types'
import { calculateComparison, YearlyRateOverride } from '../utils/calculations'
import {
  loadHistoricalRates,
  yearRangeFromRates,
  type HistoricalYearRates,
} from '../utils/historicalRates'
import { getStrategyName } from '../utils/strategyNames'

interface HistoricalSectionProps {
  inputs: CalculationInputs
  leftStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  rightStrategy: 'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'
  splitRatio: number
  switchYears: number
}

function formatAxisCurrency(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const s = m % 1 === 0 ? String(m) : m.toFixed(1)
    return `${sign}$${s}m`
  }
  const k = abs / 1000
  const s = k % 1 === 0 ? String(k) : k.toFixed(1)
  return `${sign}$${s}k`
}

function buildYearlyRatesFromHistorical(
  rates: HistoricalYearRates[],
  startYear: number,
  endYear: number
): YearlyRateOverride[] {
  const out: YearlyRateOverride[] = []
  for (let y = startYear; y <= endYear; y++) {
    const r = rates.find((row) => row.financialYear === y)
    if (r) {
      out.push({
        mortgageInterestRate: r.housingLendingRatePct / 100,
        investmentReturnRate: r.asxReturnPct / 100,
        dividendYield: 0,
      })
    }
  }
  return out
}

export function HistoricalSection({
  inputs,
  leftStrategy,
  rightStrategy,
  splitRatio,
  switchYears,
}: HistoricalSectionProps) {
  const [rates, setRates] = useState<HistoricalYearRates[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2010])

  useEffect(() => {
    loadHistoricalRates()
      .then((r) => {
        setRates(r)
        const { minYear, maxYear } = yearRangeFromRates(r)
        const duration = Math.round(inputs.years)
        const defaultStart = Math.max(minYear, maxYear - duration)
        setYearRange([defaultStart, maxYear])
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load historical rates'))
  }, [])

  const range = useMemo(() => yearRangeFromRates(rates), [rates])

  const startYearClamped = Math.max(range.minYear, Math.min(yearRange[0], range.maxYear))
  const endYearClamped = Math.max(range.minYear, Math.min(yearRange[1], range.maxYear))
  const effectiveStartFinal = Math.min(startYearClamped, endYearClamped)
  const effectiveEndFinal = Math.max(startYearClamped, endYearClamped)
  const sliderValue: [number, number] = rates.length === 0 ? [range.minYear, range.maxYear] : [startYearClamped, endYearClamped]

  const yearlyRates = useMemo(() => {
    if (rates.length === 0) return []
    return buildYearlyRatesFromHistorical(rates, effectiveStartFinal, effectiveEndFinal)
  }, [rates, effectiveStartFinal, effectiveEndFinal])

  const historicalComparison = useMemo(() => {
    if (yearlyRates.length === 0) return null
    try {
      return calculateComparison(
        { ...inputs, splitRatio, switchYears },
        leftStrategy,
        rightStrategy,
        undefined,
        { yearlyRates, startFinancialYear: effectiveStartFinal }
      )
    } catch {
      return null
    }
  }, [inputs, splitRatio, switchYears, leftStrategy, rightStrategy, yearlyRates, effectiveStartFinal])

  const leftName = getStrategyName(leftStrategy, splitRatio, switchYears)
  const rightName = getStrategyName(rightStrategy, splitRatio, switchYears)
  const leftKey = `${leftName} Net Worth`
  const rightKey = `${rightName} Net Worth`

  const chartData = useMemo(() => {
    if (!historicalComparison) return []
    return historicalComparison.left.map((left, i) => {
      const right = historicalComparison.right[i]
      return {
        year: left.year,
        [leftKey]: Math.round(left.netWorth),
        [rightKey]: Math.round(right.netWorth),
      }
    })
  }, [historicalComparison, leftKey, rightKey])

  const effectiveRatesChartData = useMemo(() => {
    const taxFactor = 1 - inputs.personalTaxRate * (1 - inputs.capitalGainsRate)
    return rates.map((r) => {
      const mortgagePct = inputs.isInvestmentProperty
        ? r.housingLendingRatePct * (1 - inputs.personalTaxRate)
        : r.housingLendingRatePct
      const effectiveAsxPct = r.asxReturnPct * taxFactor
      return {
        year: r.financialYear,
        'Effective mortgage cost %': Math.round(mortgagePct * 100) / 100,
        'Effective investment return %': Math.round(effectiveAsxPct * 100) / 100,
        nominalMortgagePct: r.housingLendingRatePct,
        nominalAsxPct: r.asxReturnPct,
      }
    })
  }, [rates, inputs.personalTaxRate, inputs.capitalGainsRate, inputs.isInvestmentProperty])

  const handleRangeChange = (value: number | number[]) => {
    const [a, b] = value as number[]
    const low = Math.max(range.minYear, Math.min(a, b))
    const high = Math.min(range.maxYear, Math.max(a, b))
    setYearRange([low, high])
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Historical rates (Australia)</h2>
        <p className="text-red-600">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Historical rates (Australia)</h2>
      <p className="text-sm text-gray-600">
        Historical mortgage and ASX returns, adjusted to effective after-tax rates using your tax rate and CGT discount. We assume a 12+ month hold so the CGT discount (e.g. 50% in Australia) applies.
        When the blue line (effective investment return) is above the orange line (effective mortgage cost), investing
        that year would have beaten offset; otherwise offset wins.
      </p>
      <p className="text-xs text-gray-500 mt-1">
        <strong>Sources:</strong>{' '}
        <a href="https://www.rba.gov.au/statistics/tables/xls/f05hist.xlsx" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">RBA Table F5 – Indicator Lending Rates</a>
        {' '}(housing loans, banks, variable, standard, owner-occupier; avg monthly rate over FY).{' '}
        <a href="https://www.rba.gov.au/statistics/tables/pdf/f07.pdf" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">RBA Table F7 – Share Market</a>
        {' '}(S&P/ASX 200 Accumulation Index, total return by financial year, dividends reinvested).
      </p>

      {effectiveRatesChartData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Effective mortgage cost vs effective investment return (after tax)</h3>
          <p className="text-sm text-gray-500 mb-3">
            Both series use your tax rate and CGT discount. Mortgage: nominal rate, or after-tax cost if investment property. Investment: ASX return after CGT (full return as capital; 12+ month hold so your CGT discount applies).
          </p>
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={effectiveRatesChartData} margin={{ top: 15, right: 30, left: 56, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Financial year', position: 'insideBottom', offset: -5 }}
                  type="number"
                  allowDecimals={false}
                  domain={[range.minYear, range.maxYear]}
                />
                <YAxis
                  label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', offset: -8 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  labelFormatter={(label) => `FY ${label}`}
                  content={({ active, payload }: TooltipProps<number, string>) => {
                    if (!active || !payload || !payload.length) return null
                    const p = payload[0].payload as { year: number; nominalMortgagePct: number; nominalAsxPct: number }
                    const mortgage = payload.find((e) => e.dataKey === 'Effective mortgage cost %')?.value as number | undefined
                    const invest = payload.find((e) => e.dataKey === 'Effective investment return %')?.value as number | undefined
                    const better = mortgage != null && invest != null
                      ? (invest > mortgage ? 'Invest' : invest < mortgage ? 'Offset' : 'Tie')
                      : null
                    return (
                      <div className="bg-white border border-gray-300 rounded shadow-lg p-2">
                        <p className="font-semibold mb-1 text-gray-900">FY {p.year}</p>
                        <p style={{ color: '#f97316' }}>
                          Effective mortgage cost: {typeof mortgage === 'number' ? mortgage.toFixed(2) : ''}% ({p.nominalMortgagePct.toFixed(2)}%)
                        </p>
                        <p style={{ color: '#3b82f6' }}>
                          Effective investment return: {typeof invest === 'number' ? invest.toFixed(2) : ''}% ({p.nominalAsxPct.toFixed(2)}%)
                        </p>
                        {better && <p className="text-xs font-medium mt-1">Better: {better}</p>}
                      </div>
                    )
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="Effective mortgage cost %"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Effective mortgage cost"
                />
                <Line
                  type="monotone"
                  dataKey="Effective investment return %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Effective investment return"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Simulate over a date range</h3>
        <p className="text-sm text-gray-500 mb-3">
          Drag the two handles to choose start and end financial year. The calculator uses actual mortgage and ASX
          returns for each year in that range and shows how each strategy would have grown.
        </p>
        <div className="px-2 py-4">
          <Slider
            range
            min={range.minYear}
            max={range.maxYear}
            value={sliderValue}
            onChange={handleRangeChange}
            step={1}
            className="[&_.rc-slider-track]:bg-blue-200 [&_.rc-slider-handle]:border-2 [&_.rc-slider-handle]:border-blue-600 [&_.rc-slider-handle]:bg-white"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{range.minYear}</span>
            <span className="font-medium text-gray-900">
              FY {effectiveStartFinal} – FY {effectiveEndFinal}
            </span>
            <span>{range.maxYear}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Range: FY {effectiveStartFinal} to FY {effectiveEndFinal} ({yearlyRates.length} years)
        </p>
      </div>

      {chartData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Net worth over period (historical rates)</h3>
          <p className="text-sm text-gray-500 mb-3">
            Cumulative net worth over the selected range. Same model as the Net Worth Comparison above: your tax rate,
            CGT discount, mortgage and investment assumptions, with historical mortgage and ASX returns applied year by
            year.
          </p>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 78, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Financial year', position: 'insideBottom', offset: -5 }}
                  type="number"
                  allowDecimals={false}
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  label={{ value: 'Net Worth ($)', angle: -90, position: 'insideLeft', offset: -32 }}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  labelFormatter={(label) => `FY ${label}`}
                  content={({ active, payload, label }: TooltipProps<number, string>) => {
                    if (!active || !payload || !payload.length) return null
                    const sortedPayload = [...payload].sort((a, b) => {
                      const aVal = typeof a.value === 'number' ? a.value : 0
                      const bVal = typeof b.value === 'number' ? b.value : 0
                      return bVal - aVal
                    })
                    return (
                      <div className="bg-white border border-gray-300 rounded shadow-lg p-2">
                        <p className="font-semibold mb-1 text-gray-900">FY {label}</p>
                        {sortedPayload.map((entry, index) => {
                          const value = typeof entry.value === 'number' ? entry.value : 0
                          let name = String(entry.name || '').replace(' Net Worth', '')
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              {name}: ${value.toLocaleString()}
                            </p>
                          )
                        })}
                      </div>
                    )
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={leftKey}
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name={leftName}
                />
                <Line
                  type="monotone"
                  dataKey={rightKey}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name={rightName}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
