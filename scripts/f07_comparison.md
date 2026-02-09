# F7 PDF vs historical_rates.csv

## What F7 is (from f07.pdf)

- **RBA Table F7 – Share Market**: S&P/ASX 200 **accumulation** index (total return, dividends reinvested), end‑month.
- The PDF shows monthly data; the main “S&P/ASX 200 Accumulation” column is the one we care about.

## Do they line up?

**Not directly**, because of two differences:

| | **Our file (historical_rates.csv)** | **F7 PDF** |
|---|-------------------------------------|------------|
| **Year definition** | Calendar year (Jan–Dec) | Financial year (Jul–Jun) |
| **ASX measure** | Price return only (Yahoo ^AXJO) | **Accumulation** (total return, dividends reinvested) |

So:

- Same broad index (S&P/ASX 200), but F7 is **total return**, our file is **price return** (no dividends).
- F7 is **financial year** (e.g. 2014 = Jul 2013 → Jun 2014), our file is **calendar year** (2014 = Jan 2014 → Dec 2014).

So the numbers are not meant to match row‑for‑row; they’re different definitions.

## Sanity check using F7 (Jun–Jun accumulation)

From the PDF, S&P/ASX 200 Accumulation index (end‑June):

| June of year | Index level |
|--------------|-------------|
| 2013 | 39,163 |
| 2014 | 45,991 |
| 2015 | 48,602 |
| 2016 | 48,872 |
| 2017 | 55,759 |
| 2018 | 63,015 |

Financial‑year return (Jun → Jun) = (this Jun / last Jun) − 1:

| Financial year | F7 accumulation return |
|----------------|------------------------|
| FY2014 (Jul 13–Jun 14) | (45,991 / 39,163) − 1 = **17.4%** |
| FY2015 | (48,602 / 45,991) − 1 = **5.7%** |
| FY2016 | (48,872 / 48,602) − 1 = **0.6%** |
| FY2017 | (55,759 / 48,872) − 1 = **14.1%** |
| FY2018 | (63,015 / 55,759) − 1 = **13.0%** |

So F7 gives **accumulation** (with dividends) and **financial year**. Our file gives **price** (no dividends) and **calendar year**, so:

- Our 2014 (calendar, price): **4.26%**
- F7 FY2014 (financial, accumulation): **17.4%**

Both can be correct for their period and definition; they don’t line up because the period and the measure differ.

## Conclusion

- **F7** = official RBA S&P/ASX 200 **accumulation** (total return), **financial year**.
- **historical_rates.csv** = Yahoo ^AXJO **price** return, **calendar year**.
- They do **not** line up number‑for‑number; the PDF is the right source if you want accumulation and/or financial year. The RBA only publishes F7 as PDF (no Excel/CSV), so automating from F7 would require PDF parsing or manual entry of the accumulation series.
