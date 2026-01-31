import { useState, useMemo } from 'react'
import { CalculationInputs } from './types'
import { defaultInputs } from './utils/defaults'
import { calculateComparison } from './utils/calculations'
import { InputForm } from './components/InputForm'
import { ResultsChart } from './components/ResultsChart'
import { SummaryCard } from './components/SummaryCard'
import { BreakdownCard } from './components/BreakdownCard'

function App() {
  const [inputs, setInputs] = useState<CalculationInputs>(defaultInputs)
  const [leftStrategy, setLeftStrategy] = useState<'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'>('allOffset')
  const [rightStrategy, setRightStrategy] = useState<'allOffset' | 'allInvestment' | 'split' | 'offsetThenInvestment' | 'offsetThenInvestmentMove'>('allInvestment')
  const [splitRatio, setSplitRatio] = useState<number>(0.5)
  const [switchYears, setSwitchYears] = useState<number>(5)
  const [timePeriod, setTimePeriod] = useState<number | null>(null)

  const inputsWithStrategyParams = useMemo(() => ({ ...inputs, splitRatio, switchYears }), [inputs, splitRatio, switchYears])
  const comparison = useMemo(() => {
    try {
      return calculateComparison(inputsWithStrategyParams, leftStrategy, rightStrategy, timePeriod || undefined)
    } catch (error) {
      console.error('Calculation error:', error)
      return {
        left: [],
        right: [],
        leftStrategy: leftStrategy,
        rightStrategy: rightStrategy,
      }
    }
  }, [inputsWithStrategyParams, leftStrategy, rightStrategy, timePeriod])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Invest vs Offset Calculator
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Compare investing in shares versus parking money in your offset account
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <InputForm inputs={inputs} onChange={setInputs} />
          <SummaryCard 
            comparison={comparison} 
            inputs={inputs} 
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
            timePeriod={timePeriod}
            onLeftStrategyChange={setLeftStrategy}
            onRightStrategyChange={setRightStrategy}
            onSplitRatioChange={setSplitRatio}
            onSwitchYearsChange={setSwitchYears}
            onTimePeriodChange={setTimePeriod}
          />
          <ResultsChart 
            comparison={comparison} 
            inputs={inputs} 
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
            timePeriod={timePeriod}
          />
          <BreakdownCard 
            comparison={comparison} 
            inputs={inputs}
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
            timePeriod={timePeriod}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-gray-500">
            <strong>Disclaimer:</strong> This calculator is for educational purposes only. 
            It provides projections based on your inputs and does not constitute financial advice. 
            Investment returns are not guaranteed, and past performance is not indicative of future results. 
            Tax rates and rules may change. Please consult with a qualified financial advisor before making 
            financial decisions. Calculations assume annual compounding and may not reflect all tax nuances 
            or investment fees.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            <strong>Note:</strong> Default values are based on historical averages and current market data. 
            See the Sources section above for detailed references. All calculations are estimates and actual 
            results may vary significantly.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

