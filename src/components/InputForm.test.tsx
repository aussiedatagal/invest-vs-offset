import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputForm } from './InputForm'
import { defaultInputs } from '../utils/defaults'

describe('InputForm', () => {
  it('should render all input fields', () => {
    const onChange = vi.fn()
    render(<InputForm inputs={defaultInputs} onChange={onChange} />)

    expect(screen.getByLabelText(/initial amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mortgage interest rate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/investment return rate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/investment property/i)).toBeInTheDocument()
  })

  it('should display percentage values as percentages', () => {
    const onChange = vi.fn()
    render(<InputForm inputs={defaultInputs} onChange={onChange} />)

    const mortgageRateInput = screen.getByLabelText(/mortgage interest rate/i) as HTMLInputElement
    expect(mortgageRateInput.value).toBe('5.50')
  })

  it('should convert percentage inputs to decimals', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const customInputs = { ...defaultInputs, mortgageInterestRate: 0 }
    render(<InputForm inputs={customInputs} onChange={onChange} />)

    const mortgageRateInput = screen.getByLabelText(/mortgage interest rate/i) as HTMLInputElement
    await user.clear(mortgageRateInput)
    await user.type(mortgageRateInput, '7')

    const calls = onChange.mock.calls
    const lastCall = calls[calls.length - 1][0]
    expect(lastCall.mortgageInterestRate).toBeCloseTo(0.07, 2)
  })

  it('should handle checkbox for investment property', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InputForm inputs={defaultInputs} onChange={onChange} />)

    const checkbox = screen.getByLabelText(/investment property/i)
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isInvestmentProperty: true,
      })
    )
  })
})

