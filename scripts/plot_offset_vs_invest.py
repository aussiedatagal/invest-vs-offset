import json
import pathlib
import subprocess
import sys

import matplotlib.pyplot as plt
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "scripts" / "offset-vs-invest.json"
OUTPUT_PATH = ROOT / "offset-vs-invest.png"


def main() -> int:
    result = subprocess.run(
        ["npx", "tsx", str(ROOT / "scripts" / "offset-vs-invest.ts")],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(result.stdout)
    DATA_PATH.write_text(json.dumps(data, indent=2))

    investment_rates = data["investmentRates"]
    offset_net_worths = data["offsetNetWorths"]
    invest_net_worths = data["investNetWorths"]

    # Find intersection point (where difference is closest to zero)
    differences = np.array(offset_net_worths) - np.array(invest_net_worths)
    intersection_idx = np.argmin(np.abs(differences))
    intersection_rate = investment_rates[intersection_idx]
    intersection_net_worth = offset_net_worths[intersection_idx]

    plt.figure(figsize=(12, 7))
    plt.plot(
        investment_rates,
        offset_net_worths,
        linewidth=2,
        label="Offset Strategy",
        color="#2563eb",
    )
    plt.plot(
        investment_rates,
        invest_net_worths,
        linewidth=2,
        label="Investment Strategy",
        color="#dc2626",
    )
    
    # Mark and label intersection point
    plt.plot(
        intersection_rate,
        intersection_net_worth,
        marker="o",
        markersize=10,
        color="black",
        zorder=5,
    )
    plt.annotate(
        f"Break-even: {intersection_rate:.2f}%\nNet Worth: ${intersection_net_worth:,.0f}",
        xy=(intersection_rate, intersection_net_worth),
        xytext=(10, 20),
        textcoords="offset points",
        fontsize=10,
        bbox=dict(boxstyle="round,pad=0.5", facecolor="yellow", alpha=0.7),
        arrowprops=dict(arrowstyle="->", connectionstyle="arc3,rad=0"),
    )
    
    plt.title("Net Worth After 20 Years: Offset vs Investment Strategy", fontsize=14, fontweight="bold")
    plt.xlabel("Investment Return Rate (%)", fontsize=12)
    plt.ylabel("Net Worth ($)", fontsize=12)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=150)

    print(f"Wrote data to {DATA_PATH}")
    print(f"Wrote chart to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
