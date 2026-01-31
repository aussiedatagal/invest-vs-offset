export interface Source {
  name: string
  url: string
  description: string
}

export interface DefaultValueSource {
  field: keyof import('../types').CalculationInputs
  source: Source
  note?: string
}

export const defaultValueSources: DefaultValueSource[] = [
  {
    field: 'mortgageInterestRate',
    source: {
      name: 'RBA Statistical Tables',
      url: 'https://www.rba.gov.au/statistics/tables/#interest-rates',
      description: 'Owner-occupier housing rate for new loans: 5.48% (November 2025). Current rates available in Table F5.',
    },
  },
  {
    field: 'investmentReturnRate',
    source: {
      name: 'AustralianSuper Performance',
      url: 'https://www.australiansuper.com/why-choose-us/our-performance?superType=Super&display=table',
      description: 'Historical investment returns',
    },
  },
  {
    field: 'capitalGainsRate',
    source: {
      name: 'ATO - Capital Gains Tax',
      url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/',
      description: '50% capital gains discount applies to assets held for 12+ months',
    },
  },
  {
    field: 'personalTaxRate',
    source: {
      name: 'ATO - Individual Income Tax Rates',
      url: 'https://www.ato.gov.au/rates/individual-income-tax-rates/',
      description: 'Marginal tax rates including Medicare levy (32.5% for $45k-$120k bracket)',
    },
  },
]

export const generalSources: Source[] = [
  {
    name: 'Moneysmart (ASIC)',
    url: 'https://moneysmart.gov.au/budgeting-and-saving/compound-interest-calculator',
    description: 'Australian Government financial calculators and default assumptions',
  },
  {
    name: 'Vanguard Index Chart',
    url: 'https://www.vanguard.com.au/personal/support/index-chart',
    description: 'Historical performance of Australian shares and other asset classes over 30 years',
  },
  {
    name: 'RBA Chart Pack',
    url: 'https://www.rba.gov.au/chart-pack/',
    description: 'Current economic data including interest rates and market indicators',
  },
]

