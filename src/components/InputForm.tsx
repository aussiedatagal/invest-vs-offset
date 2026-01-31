import { useState, useEffect } from 'react'
import { CalculationInputs } from '../types'
import { inputLabels, inputDescriptions } from '../utils/defaults'
import { defaultValueSources } from '../utils/sources'
import { calculateAmortizedPayment } from '../utils/calculations'

interface InputFormProps {
  inputs: CalculationInputs
  onChange: (inputs: CalculationInputs) => void
}

export function InputForm({ inputs, onChange }: InputFormProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  const isPercentageField = (key: keyof CalculationInputs): boolean => {
    return [
      'mortgageInterestRate',
      'investmentReturnRate',
      'dividendYield',
      'capitalGainsRate',
      'personalTaxRate',
    ].includes(key)
  }

  useEffect(() => {
    const newLocalValues: Record<string, string> = {}
    Object.keys(inputs).forEach((key) => {
      if (focusedField === key) {
        return
      }
      const value = inputs[key as keyof CalculationInputs]
      if (typeof value === 'number') {
        if (isPercentageField(key as keyof CalculationInputs)) {
          newLocalValues[key] = (value * 100).toFixed(2)
        } else {
          newLocalValues[key] = String(value)
        }
      }
    })
    setLocalValues(prev => {
      const merged = { ...prev, ...newLocalValues }
      return merged
    })
  }, [inputs, focusedField])

  const handleChange = (key: keyof CalculationInputs, value: string | number | boolean) => {
    let validatedValue: number | boolean = value as number | boolean
    
    if (typeof value === 'number') {
      if (key === 'years' && (value < 1 || value > 100 || !Number.isInteger(value))) {
        return
      }
      if (key === 'splitRatio' && (value < 0 || value > 1)) {
        return
      }
      if (key === 'switchYears' && (value < 1 || value > 100 || !Number.isInteger(value))) {
        return
      }
      if (['mortgageInterestRate', 'investmentReturnRate', 'dividendYield', 'personalTaxRate'].includes(key) && (value < 0 || value > 1)) {
        return
      }
      if (['initialAmount', 'weeklyContribution', 'mortgageBalance'].includes(key) && value < 0) {
        return
      }
      if (isNaN(value) || !isFinite(value)) {
        return
      }
    }
    
    onChange({ ...inputs, [key]: validatedValue })
  }

  const getSourceForField = (key: keyof CalculationInputs) => {
    return defaultValueSources.find(s => s.field === key)
  }

  const renderInput = (key: keyof CalculationInputs) => {
    const value = inputs[key]
    const label = inputLabels[key]
    const description = inputDescriptions[key]
    const sourceInfo = getSourceForField(key)

    if (key === 'isInvestmentProperty') {
      return (
        <div key={key} className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
          </label>
        </div>
      )
    }

    if (key === 'strategy') {
      return (
        <div key={key} className="space-y-2">
          <label htmlFor={key} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <select
            id={key}
            value={value as string}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="allOffset">Prioritise offset</option>
            <option value="allInvestment">Prioritise investments</option>
            <option value="split">Split between offset and investments</option>
            <option value="offsetThenInvestment">Offset for X years then invest</option>
            <option value="offsetThenInvestmentMove">Offset for X years then invest (move offset balance)</option>
          </select>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      )
    }

    if (key === 'splitRatio') {
      if (inputs.strategy !== 'split') {
        return null
      }
      const localValue = localValues[key] ?? (typeof value === 'number' ? String(value * 100) : '')
      return (
        <div key={key} className="space-y-2">
          <label htmlFor={key} className="block text-sm font-medium text-gray-700">
            {inputLabels[key]}
          </label>
          <input
            id={key}
            type="number"
            value={localValue}
            onChange={(e) => {
              const rawValue = e.target.value
              setLocalValues({ ...localValues, [key]: rawValue })
              if (rawValue.trim() === '') {
                return
              }
              const inputValue = parseFloat(rawValue)
              if (isNaN(inputValue) || inputValue < 0 || inputValue > 100) {
                return
              }
              handleChange(key, inputValue / 100)
            }}
            onBlur={(e) => {
              const rawValue = e.target.value.trim()
              if (rawValue === '' && typeof value === 'number') {
                setLocalValues({ ...localValues, [key]: (value * 100).toFixed(2) })
              } else if (rawValue !== '') {
                const numValue = parseFloat(rawValue)
                if (!isNaN(numValue)) {
                  setLocalValues({ ...localValues, [key]: numValue.toFixed(2) })
                }
              }
            }}
            step={0.1}
            min={0}
            max={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500">{inputDescriptions[key]}</p>
          <p className="text-xs text-amber-600 italic">
            Example: 50% means half your initial amount and half your weekly contributions go to offset (up to mortgage balance limit), the rest to investments.
          </p>
        </div>
      )
    }

    if (key === 'switchYears') {
      if (inputs.strategy !== 'offsetThenInvestment' && inputs.strategy !== 'offsetThenInvestmentMove') {
        return null
      }
      const currentValue = typeof value === 'number' ? value : (inputs.switchYears || 5)
      const localValue = localValues[key] ?? String(currentValue)
      return (
        <div key={key} className="space-y-2">
          <label htmlFor={key} className="block text-sm font-medium text-gray-700">
            {inputLabels[key]}
          </label>
          <input
            id={key}
            type="number"
            value={localValue}
            onChange={(e) => {
              const rawValue = e.target.value
              setLocalValues({ ...localValues, [key]: rawValue })
              if (rawValue.trim() === '') {
                return
              }
              const inputValue = parseInt(rawValue, 10)
              if (isNaN(inputValue) || inputValue < 1 || inputValue > 100) {
                return
              }
              handleChange(key, inputValue)
            }}
            onBlur={(e) => {
              const rawValue = e.target.value.trim()
              if (rawValue === '' && typeof value === 'number') {
                setLocalValues({ ...localValues, [key]: String(value) })
              }
            }}
            step={1}
            min={1}
            max={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500">{inputDescriptions[key]}</p>
        </div>
      )
    }

    const displayValue = isPercentageField(key) && typeof value === 'number'
      ? value * 100
      : value
    const localValue = localValues[key] ?? (typeof displayValue === 'number' 
      ? (isPercentageField(key) ? displayValue.toFixed(2) : String(displayValue))
      : '')

    return (
      <div key={key} className="space-y-2">
        <label htmlFor={key} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={key}
          type="number"
          value={localValue}
          onFocus={() => setFocusedField(key)}
          onBlur={() => {
            setFocusedField(null)
            const rawValue = (document.getElementById(key) as HTMLInputElement)?.value.trim()
            if (rawValue === '') {
              const formattedValue = isPercentageField(key) 
                ? (typeof displayValue === 'number' ? displayValue.toFixed(2) : '0.00')
                : (typeof displayValue === 'number' ? String(displayValue) : '')
              setLocalValues({ ...localValues, [key]: formattedValue })
            } else if (isPercentageField(key)) {
              const numValue = parseFloat(rawValue)
              if (!isNaN(numValue)) {
                setLocalValues({ ...localValues, [key]: numValue.toFixed(2) })
              } else {
                const formattedValue = typeof displayValue === 'number' ? displayValue.toFixed(2) : '0.00'
                setLocalValues({ ...localValues, [key]: formattedValue })
              }
            }
          }}
          onChange={(e) => {
            const rawValue = e.target.value
            setLocalValues({ ...localValues, [key]: rawValue })
            if (rawValue.trim() === '') {
              return
            }
            const inputValue = parseFloat(rawValue)
            if (isNaN(inputValue) || !isFinite(inputValue)) {
              return
            }
            const numValue = isPercentageField(key)
              ? inputValue / 100
              : key === 'years'
              ? parseInt(rawValue, 10)
              : inputValue
            if (key === 'years' && isNaN(numValue)) {
              return
            }
            handleChange(key, numValue)
          }}
          step={key === 'years' ? 1 : isPercentageField(key) ? 0.1 : 0.01}
          min={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
        <p className="text-xs text-gray-500">{description}</p>
        {sourceInfo && (
          <div className="mt-1">
            <a
              href={sourceInfo.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
            >
              Source: {sourceInfo.source.name} →
            </a>
            {sourceInfo.note && (
              <p className="text-xs text-amber-600 mt-0.5 italic">{sourceInfo.note}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderSection = (title: string, keys: (keyof CalculationInputs)[], showCalculatedPayment?: boolean) => {
    const calculatedPayment = showCalculatedPayment 
      ? calculateAmortizedPayment(inputs.mortgageBalance, inputs.mortgageInterestRate, inputs.years)
      : null

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keys.map((key) => renderInput(key)).filter(Boolean)}
        </div>
        {showCalculatedPayment && calculatedPayment !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-gray-700">
              Calculated Weekly Mortgage Payment: <span className="text-blue-700">${(calculatedPayment / 52).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              (Annual: ${calculatedPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}) - This payment will amortize the mortgage over {inputs.years} years
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
      
      {renderSection('Basic Setup', ['mortgageBalance', 'years', 'mortgageInterestRate', 'isInvestmentProperty'], true)}
      
      {renderSection('Investment Assumptions', ['investmentReturnRate', 'dividendYield', 'capitalGainsRate'])}
      
      {renderSection('Tax Information', ['personalTaxRate'])}
      
      {renderSection('Contributions', ['initialAmount', 'weeklyContribution'])}
    </div>
  )
}

