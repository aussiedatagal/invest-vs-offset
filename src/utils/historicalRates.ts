/**
 * Historical Australian financial-year rates for mortgage (RBA F5) and ASX 200 accumulation (total return).
 * Sources: RBA f05hist.xlsx (mortgage); RBA Table F7 (ASX 200 accumulation).
 */

export interface HistoricalYearRates {
  financialYear: number
  housingLendingRatePct: number
  asxReturnPct: number
}

export type OffsetVsInvestWinner = 'offset' | 'invest' | 'tie'

export interface HistoricalYearWithWinner extends HistoricalYearRates {
  winner: OffsetVsInvestWinner
}

let cachedRates: HistoricalYearRates[] | null = null

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

export async function loadHistoricalRates(): Promise<HistoricalYearRates[]> {
  if (cachedRates) return cachedRates
  const res = await fetch('/historical_rates.csv')
  const text = await res.text()
  const lines = text.split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
  const header = parseCsvLine(lines[0])
  const yearIdx = header.indexOf('financial_year')
  const mortgageIdx = header.indexOf('housing_lending_rate_pct')
  const asxIdx = header.indexOf('asx_return_pct')
  if (yearIdx === -1 || mortgageIdx === -1 || asxIdx === -1) {
    throw new Error('historical_rates.csv missing expected columns')
  }
  const rates: HistoricalYearRates[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i])
    const year = parseInt(row[yearIdx], 10)
    const mortgage = parseFloat(row[mortgageIdx])
    const asx = parseFloat(row[asxIdx])
    if (Number.isNaN(year) || Number.isNaN(mortgage) || Number.isNaN(asx)) continue
    rates.push({
      financialYear: year,
      housingLendingRatePct: mortgage,
      asxReturnPct: asx,
    })
  }
  cachedRates = rates
  return rates
}

export function getWinnerForYear(mortgagePct: number, asxReturnPct: number): OffsetVsInvestWinner {
  const diff = asxReturnPct - mortgagePct
  if (Math.abs(diff) < 0.01) return 'tie'
  return diff > 0 ? 'invest' : 'offset'
}

export function historicalRatesWithWinners(rates: HistoricalYearRates[]): HistoricalYearWithWinner[] {
  return rates.map((r) => ({
    ...r,
    winner: getWinnerForYear(r.housingLendingRatePct, r.asxReturnPct),
  }))
}

export function yearRangeFromRates(rates: HistoricalYearRates[]): { minYear: number; maxYear: number } {
  if (rates.length === 0) return { minYear: 1981, maxYear: 2023 }
  const years = rates.map((r) => r.financialYear)
  return { minYear: Math.min(...years), maxYear: Math.max(...years) }
}
