import { useState, useMemo } from 'react'
import { CalculationInputs } from './types'
import { defaultInputs } from './utils/defaults'
import { calculateComparison } from './utils/calculations'
import { InputForm } from './components/InputForm'
import { ResultsChart } from './components/ResultsChart'
import { SummaryCard } from './components/SummaryCard'
import { BreakdownCard } from './components/BreakdownCard'
import { StrategyHeatmap } from './components/StrategyHeatmap'
import { HistoricalSection } from './components/HistoricalSection'
import { generalSources } from './utils/sources'

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
          <details className="rounded-lg border border-gray-200 overflow-hidden group bg-white shadow-sm">
            <summary className="list-none cursor-pointer flex items-center gap-2 p-4 sm:p-5 border-b border-gray-100 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none [&::-webkit-details-marker]:hidden select-none">
              <span className="text-gray-400 transition-transform duration-200 group-open:rotate-90" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Yearly breakdown
              </h2>
            </summary>
            <div className="p-4 sm:p-5 bg-gray-50/50">
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
          </details>
          <ResultsChart 
            comparison={comparison} 
            inputs={inputs} 
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
            timePeriod={timePeriod}
          />
          <StrategyHeatmap
            inputs={inputs}
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
          />
          <HistoricalSection
            inputs={inputsWithStrategyParams}
            leftStrategy={leftStrategy}
            rightStrategy={rightStrategy}
            splitRatio={splitRatio}
            switchYears={switchYears}
          />

          <section className="bg-white rounded-lg shadow-md p-6" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="text-2xl font-bold text-gray-900 mb-4">Sources and further reading</h2>
            <ul className="list-none space-y-2 text-sm">
              {generalSources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    {s.name}
                  </a>
                  <span className="text-gray-500"> – {s.description}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <p className="text-xs text-gray-500">
            <strong>Disclaimer:</strong> This calculator is for educational purposes only. 
            It provides projections based on your inputs and does not constitute financial advice. 
            Investment returns are not guaranteed, and past performance is not indicative of future results. 
            Tax rates and rules may change. Please consult with a qualified financial advisor before making 
            financial decisions. Calculations assume annual compounding and may not reflect all tax nuances 
            or investment fees.
          </p>
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> Default values are based on historical averages and current market data. 
            Source links appear next to each input and in the Sources section above. All calculations are estimates and actual 
            results may vary significantly.
          </p>
          <p className="text-xs text-gray-500 border-t border-gray-200 pt-4 mt-4">
            By <a href="https://aussiedatagal.github.io/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">aussiedatagal</a>.
            This project is provided as-is under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">MIT License</a>; see the LICENSE file in the source repository for full terms. No warranty is given.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

