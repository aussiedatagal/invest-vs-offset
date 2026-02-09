"""
Cross-check ASX accumulation returns against RBA F7 (Share Market) PDF.
F7 contains S&P/ASX 200 Accumulation index end-month. We extract June values
and compute financial-year return = (Jun Y / Jun Y-1 - 1) * 100, then compare
to scripts/asx_accumulation_annual.csv (NetActuary).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
F07_PDF = ROOT / "f07.pdf"
ASX_ACCUM = ROOT / "scripts" / "asx_accumulation_annual.csv"


def parse_numbers(s):
    toks = s.split()
    nums = []
    i = 0
    while i < len(toks):
        t = toks[i]
        if t.replace(".", "").isdigit():
            n = t
            i += 1
            while i < len(toks) and len(toks[i]) == 3 and toks[i].isdigit():
                n += toks[i]
                i += 1
            nums.append(float(n))
        else:
            i += 1
    return nums


def extract_f7_june_accumulation():
    from pypdf import PdfReader
    if not F07_PDF.exists():
        return {}
    r = PdfReader(str(F07_PDF))
    text = r.pages[0].extract_text() or ""
    current_fy = None
    june_values = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("S&P") or line.startswith("05/07") or line.startswith("Banks"):
            continue
        if "Share" in line or "Sources:" in line:
            continue
        if re.match(r"^\d{4}/\d{2}$", line):
            current_fy = int(line[:4]) + 1
            continue
        parts = line.split(None, 2)
        if len(parts) < 3:
            continue
        if parts[0].isdigit() and len(parts[0]) == 4:
            year, mon, rest = int(parts[0]), parts[1], parts[2]
        elif parts[0] in ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec") and current_fy:
            mon = parts[0]
            rest = (parts[1] + " " + parts[2]) if len(parts) > 2 else parts[1]
            year = current_fy if mon in ("Jan", "Feb", "Mar", "Apr", "May", "Jun") else current_fy - 1
        else:
            continue
        if mon != "Jun":
            continue
        nums = parse_numbers(rest)
        if len(nums) >= 5 and nums[4] > 10000:
            june_values[year] = nums[4]
    return june_values


def f7_fy_returns(june_values):
    years = sorted(june_values.keys())
    return {
        years[i]: round(100 * (june_values[years[i]] / june_values[years[i - 1]] - 1), 2)
        for i in range(1, len(years))
        if years[i] == years[i - 1] + 1
    }


def load_netactuary_fy_returns():
    out = {}
    if not ASX_ACCUM.exists():
        return out
    with open(ASX_ACCUM, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "financial_year" in line:
                continue
            parts = line.split(",")
            if len(parts) >= 2:
                try:
                    out[int(parts[0].strip())] = float(parts[1].strip())
                except (ValueError, TypeError):
                    pass
    return out


def main():
    june = extract_f7_june_accumulation()
    f7 = f7_fy_returns(june)
    net = load_netactuary_fy_returns()
    common = sorted(set(f7.keys()) & set(net.keys()))
    if not common:
        print("No overlapping years between F7 PDF and NetActuary.")
        return
    print("Cross-check: RBA F7 (PDF) vs NetActuary (asx_accumulation_annual.csv)")
    print("Financial year = 1 July Y-1 to 30 June Y. Both are accumulation (dividends reinvested).\n")
    print(f"{'FY':<6} {'F7 (PDF)':<12} {'NetActuary':<12} {'Diff':<8}")
    print("-" * 42)
    for y in common:
        a, b = f7[y], net[y]
        diff = round(b - a, 2)
        print(f"{y:<6} {a:>10}%   {b:>10}%   {diff:>+6}%")
    print("\nF7 source: f07.pdf (RBA Table F7 Share Market, S&P/ASX 200 Accumulation end-Jun).")
    print("NetActuary: scripts/asx_accumulation_annual.csv (NetActuary.com.au AXJOA).")


if __name__ == "__main__":
    main()
