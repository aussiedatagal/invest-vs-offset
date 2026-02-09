"""
Produce a single CSV: yearly housing lending rate and yearly ASX return.
Output: public/historical_rates.csv (served by the app at /historical_rates.csv).
Both series use financial year (1 July Y-1 to 30 June Y). One source per series,
no mixing of price and accumulation: ASX is 100% accumulation (dividends reinvested).

Sources:
- Housing: RBA F5 Indicator Lending Rates (f05hist.xlsx). Housing loans; Banks;
  Variable; Standard; Owner-occupier. Average of monthly rates over the financial year.
  https://www.rba.gov.au/statistics/tables/xls/f05hist.xlsx
- ASX: scripts/asx_accumulation_annual.csv. S&P/ASX 200 Accumulation Index (AXJOA),
  total return (dividends reinvested) by financial year. Source: NetActuary.com.au.
  https://netactuary.com.au/Reference/ET7ASX200.aspx
  This is the only ASX source used so the column is never mixed with price returns.
"""

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
F05_PATH = ROOT / "f05hist.xlsx"
ASX_ACCUM_PATH = ROOT / "scripts" / "asx_accumulation_annual.csv"
OUTPUT_PATH = ROOT / "public" / "historical_rates.csv"

F5_DATA_FIRST_ROW = 12
F5_RATE_COLUMN = 4


def load_housing_by_financial_year() -> dict:
    """F5 housing rate: financial year Y = Jul Y-1 to Jun Y, average of monthly rates (pct)."""
    import openpyxl
    if not F05_PATH.exists():
        raise FileNotFoundError(
            f"F5 file not found: {F05_PATH}. Download from "
            "https://www.rba.gov.au/statistics/tables/xls/f05hist.xlsx"
        )
    wb = openpyxl.load_workbook(str(F05_PATH), read_only=True, data_only=True)
    ws = wb["Data"]
    by_fy = {}
    for row in ws.iter_rows(
        min_row=F5_DATA_FIRST_ROW,
        max_row=2000,
        min_col=1,
        max_col=F5_RATE_COLUMN,
        values_only=True,
    ):
        dt = row[0]
        rate = row[F5_RATE_COLUMN - 1] if len(row) >= F5_RATE_COLUMN else None
        if dt is None or rate is None:
            continue
        try:
            r = float(rate)
        except (TypeError, ValueError):
            continue
        y, m = dt.year, dt.month
        fy = y + 1 if m >= 7 else y
        if fy not in by_fy:
            by_fy[fy] = []
        by_fy[fy].append(r)
    wb.close()
    return {
        fy: round(sum(rates) / len(rates), 2)
        for fy, rates in sorted(by_fy.items())
        if rates
    }


def load_asx_accumulation_by_financial_year() -> dict:
    """NetActuary: financial year -> accumulation return (pct). Single source, 100% accumulation."""
    if not ASX_ACCUM_PATH.exists():
        return {}
    out = {}
    with open(ASX_ACCUM_PATH, newline="", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "financial_year" in line and "asx_total" in line.lower():
                continue
            parts = line.split(",")
            if len(parts) < 2:
                continue
            try:
                fy = int(parts[0].strip())
                ret = float(parts[1].strip())
                out[fy] = round(ret, 2)
            except (ValueError, TypeError):
                continue
    return out


def main():
    housing = load_housing_by_financial_year()
    asx = load_asx_accumulation_by_financial_year()
    if not asx:
        raise SystemExit(
            f"ASX accumulation data not found: {ASX_ACCUM_PATH}. "
            "That file (NetActuary AXJOA by financial year) is the only source used so returns are 100% accumulation."
        )
    years = sorted(set(housing.keys()) & set(asx.keys()))
    if not years:
        raise SystemExit("No overlapping financial years between housing and ASX data.")

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        f.write("# Financial year (year Y = 1 July Y-1 to 30 June Y). Same period for both. One source per series.\n")
        f.write("# housing_lending_rate_pct: RBA F5. Housing loans; Banks; Variable; Standard; Owner-occupier. Avg monthly rate over FY. Source: f05hist.xlsx\n")
        f.write("# asx_return_pct: S&P/ASX 200 Accumulation Index (AXJOA) total return, dividends reinvested, financial year. Source: scripts/asx_accumulation_annual.csv (NetActuary.com.au). Not mixed with price returns.\n")
        w.writerow(["financial_year", "housing_lending_rate_pct", "asx_return_pct"])
        for y in years:
            w.writerow([y, housing[y], asx[y]])

    print(f"Wrote {OUTPUT_PATH}")
    print(f"Financial years: {min(years)} to {max(years)} ({len(years)} years)")
    print("Housing: RBA F5. ASX: NetActuary accumulation only (no price/accumulation mixing).")


if __name__ == "__main__":
    main()
