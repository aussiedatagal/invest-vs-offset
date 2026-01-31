# Invest vs Offset Calculator

A React-based calculator to help Australian investors decide between investing in the share market or parking money in an offset account.

## Features

- Compare investment returns vs offset account savings
- Account for Australian tax rules (capital gains discount, tax-deductible interest)
- Configurable inputs with sensible defaults
- Professional data visualization with time-series charts
- Mobile-first responsive design

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Tests

```bash
# Unit tests
npx vitest run

# End-to-end tests
npm run test:e2e
```

## Project Structure

- `src/utils/calculations.ts` - Core financial calculation logic
- `src/components/` - React components (InputForm, ResultsChart, SummaryCard)
- `src/types.ts` - TypeScript type definitions
- `src/utils/defaults.ts` - Default values and labels

## Key Calculations

The calculator accounts for:
- Tax on capital gains (with discount)
- Tax on dividends
- Tax on interest (for investment properties)
- Interest savings from offset accounts (not taxable)
- Different treatment of PPOR vs investment property interest


