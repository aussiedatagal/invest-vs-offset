import { useMemo } from 'react'
import { CalculationInputs } from '../types'
import { getStrategyName } from '../utils/strategyNames'
import type { StrategyKey } from '../utils/strategyNames'
import { computeMortgageReturnHeatmap } from '../utils/strategyHeatmap'

interface StrategyHeatmapProps {
  inputs: CalculationInputs
  leftStrategy: StrategyKey
  rightStrategy: StrategyKey
  splitRatio: number
  switchYears: number
}

const LEFT_COLOR = '#f97316'
const RIGHT_COLOR = '#3b82f6'

function HeatmapGrid<T>({
  xLabels,
  yLabels,
  grid,
  xLabel,
  yLabel,
  title,
  meta,
  leftName,
  rightName,
  valueAt,
}: {
  xLabels: T[]
  yLabels: number[]
  grid: ('left' | 'right')[][]
  xLabel: string
  yLabel: string
  title: string
  meta?: string
  leftName: string
  rightName: string
  valueAt: (cell: 'left' | 'right') => string
}) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return (
    <div className="w-full">
      {title ? (
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      ) : null}
      <p className="text-sm text-gray-500 mb-3">
        Each cell shows which strategy has higher net worth at the end of the period.
        {meta ? ` ${meta}` : ''}
      </p>
      <div
        className="w-full mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `2.5rem 2.5rem repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr)) 1.75rem 1.5rem`,
          aspectRatio: `${2 + cols} / ${2 + rows}`,
          maxHeight: 'min(80vw, 380px)',
        }}
      >
        <div
          className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500"
          style={{ gridColumn: 1, gridRow: 1, gridRowEnd: 1 + rows, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
        >
          {yLabel}
        </div>
        {yLabels.slice().reverse().map((l, i) => (
          <div
            key={`y-${i}`}
            className="flex items-center justify-end pr-1 text-[11px] sm:text-xs text-gray-600"
            style={{ gridColumn: 2, gridRow: i + 1 }}
            title={String(l)}
          >
            {(l as number).toFixed(1)}
          </div>
        ))}
        <div
          className="grid rounded overflow-hidden border border-gray-200"
          style={{
            gridColumn: `3 / ${3 + cols}`,
            gridRow: `1 / ${1 + rows}`,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: 1,
          }}
        >
          {grid.slice().reverse().map((row, ri) =>
            row.map((cell, ci) => (
              <div
                key={`${ri}-${ci}`}
                className="min-w-0 min-h-0"
                style={{
                  backgroundColor: cell === 'left' ? LEFT_COLOR : RIGHT_COLOR,
                }}
                title={`${xLabel} ${xLabels[ci]}, ${yLabel} ${yLabels[rows - 1 - ri]}: ${valueAt(cell)}`}
                aria-hidden
              />
            ))
          )}
        </div>
        {xLabels.map((l, i) => (
          <div
            key={`x-${i}`}
            className="flex items-end justify-center text-[11px] sm:text-xs text-gray-600"
            style={{ gridColumn: i + 3, gridRow: 1 + rows }}
            title={String(l)}
          >
            {typeof l === 'number' ? (Number.isInteger(l) ? String(l) : (l as number).toFixed(1)) : String(l)}
          </div>
        ))}
        <div
          className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500"
          style={{ gridColumn: `3 / ${3 + cols}`, gridRow: 2 + rows }}
        >
          {xLabel}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: LEFT_COLOR }}
          />
          <span className="text-gray-700">{leftName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: RIGHT_COLOR }}
          />
          <span className="text-gray-700">{rightName}</span>
        </div>
      </div>
    </div>
  )
}

export function StrategyHeatmap({
  inputs,
  leftStrategy,
  rightStrategy,
  splitRatio,
  switchYears,
}: StrategyHeatmapProps) {
  const leftName = getStrategyName(leftStrategy, splitRatio, switchYears)
  const rightName = getStrategyName(rightStrategy, splitRatio, switchYears)

  const mortgageReturnData = useMemo(
    () =>
      computeMortgageReturnHeatmap(
        inputs,
        leftStrategy,
        rightStrategy,
        splitRatio,
        switchYears
      ),
    [inputs, leftStrategy, rightStrategy, splitRatio, switchYears]
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Mortgage rate vs investment return rate
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Using your current inputs except the two axes. Other assumptions (balance, contributions, tax, etc.) are unchanged.
      </p>

      <HeatmapGrid
        xLabels={mortgageReturnData.mortgageRatesPct}
        yLabels={mortgageReturnData.returnRatesPct}
        grid={mortgageReturnData.winnerGrid}
        xLabel="Mortgage interest rate (%)"
        yLabel="Investment return rate (%)"
        title=""
        meta={`Horizon: ${inputs.years} years.`}
        leftName={leftName}
        rightName={rightName}
        valueAt={(c) => (c === 'left' ? leftName : rightName)}
      />
    </div>
  )
}

