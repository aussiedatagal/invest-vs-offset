import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts'
import { calculateComparison } from '../utils/calculations'
import { CalculationInputs } from '../types'

interface ResultsChartProps {
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

export function ResultsChart({ comparison, inputs, leftStrategy, rightStrategy, splitRatio, switchYears, timePeriod }: ResultsChartProps) {
  const maxYear = comparison.left.length > 0 
    ? Math.max(...comparison.left.map(d => d.year)) 
    : 20
  const maxXAxisDomain = Math.ceil(maxYear / 5) * 5

  const inputsWithStrategyParams = { ...inputs, splitRatio, switchYears }
  // Recalculate with extended years to continue growth to the rounded domain, but respect timePeriod if set
  const extendedComparison = maxYear < maxXAxisDomain && !timePeriod
    ? calculateComparison(inputsWithStrategyParams, leftStrategy, rightStrategy, maxXAxisDomain)
    : comparison

  const leftName = getStrategyName(leftStrategy, splitRatio, switchYears)
  const rightName = getStrategyName(rightStrategy, splitRatio, switchYears)

  const chartData = extendedComparison.left.map((left, index) => {
    const right = extendedComparison.right[index]
    return {
      year: left.year,
      [`${leftName} Net Worth`]: Math.round(left.netWorth),
      [`${rightName} Net Worth`]: Math.round(right.netWorth),
      [`${leftName} Mortgage`]: Math.round(left.mortgageBalance),
      [`${rightName} Mortgage`]: Math.round(right.mortgageBalance),
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Net Worth Comparison Over Time (excludes property value)
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Net worth = investments + offset - remaining mortgage balance (excludes property value). CGT is deducted and assumes gradual selling to stay in personal tax bracket.
      </p>
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year" 
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              domain={[1, maxXAxisDomain]}
              type="number"
              allowDecimals={false}
            />
            <YAxis 
              label={{ value: 'Net Worth ($)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(label) => `Year: ${label}`}
              content={({ active, payload, label }: TooltipProps<number, string>) => {
                if (!active || !payload || !payload.length) return null
                const sortedPayload = [...payload].sort((a, b) => {
                  const aVal = typeof a.value === 'number' ? a.value : 0
                  const bVal = typeof b.value === 'number' ? b.value : 0
                  return bVal - aVal
                })
                return (
                  <div className="bg-white border border-gray-300 rounded shadow-lg p-2">
                    <p className="font-semibold mb-1 text-gray-900">Year: {label}</p>
                    {sortedPayload.map((entry, index) => {
                      const value = typeof entry.value === 'number' ? entry.value : 0
                      let rawName = String(entry.name || entry.dataKey || '')
                      // Remove the metric suffix since it's in the chart title
                      if (rawName.endsWith(' Net Worth')) {
                        rawName = rawName.slice(0, -10)
                      } else if (rawName.endsWith(' Mortgage')) {
                        rawName = rawName.slice(0, -9)
                      }
                      return (
                        <p key={index} style={{ color: entry.color }}>
                          {rawName}: ${value.toLocaleString()}
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
              dataKey={`${leftName} Net Worth`}
              stroke="#f97316" 
              strokeWidth={2}
              dot={false}
              name={leftName}
            />
            <Line 
              type="monotone" 
              dataKey={`${rightName} Net Worth`}
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name={rightName}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Mortgage Balance Over Time</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                domain={[1, maxXAxisDomain]}
                type="number"
                allowDecimals={false}
              />
              <YAxis 
                label={{ value: 'Mortgage Balance ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                labelFormatter={(label) => `Year: ${label}`}
                content={({ active, payload, label }: TooltipProps<number, string>) => {
                  if (!active || !payload || !payload.length) return null
                  const sortedPayload = [...payload].sort((a, b) => {
                    const aVal = typeof a.value === 'number' ? a.value : 0
                    const bVal = typeof b.value === 'number' ? b.value : 0
                    return bVal - aVal
                  })
                  return (
                    <div className="bg-white border border-gray-300 rounded shadow-lg p-2">
                      <p className="font-semibold mb-1 text-gray-900">Year: {label}</p>
                      {sortedPayload.map((entry, index) => {
                        const value = typeof entry.value === 'number' ? entry.value : 0
                        return (
                          <p key={index} style={{ color: entry.color }}>
                            {entry.name}: ${value.toLocaleString()}
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
                dataKey={`${leftName} Mortgage`}
                stroke="#f97316" 
                strokeWidth={2}
                dot={false}
                name={leftName}
              />
              <Line 
                type="monotone" 
                dataKey={`${rightName} Mortgage`}
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name={rightName}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  )
}
