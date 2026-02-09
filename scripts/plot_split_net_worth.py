import json
import pathlib
import subprocess
import sys

import matplotlib.pyplot as plt

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "scripts" / "split-net-worth.json"
OUTPUT_PATH = ROOT / "split-net-worth.png"


def main() -> int:
    result = subprocess.run(
        ["npx", "tsx", str(ROOT / "scripts" / "split-net-worth.ts")],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(result.stdout)
    DATA_PATH.write_text(json.dumps(data, indent=2))

    ratios = [r * 100 for r in data["ratios"]]
    net_worths = data["netWorths"]

    plt.figure(figsize=(10, 6))
    plt.plot(ratios, net_worths, linewidth=2)
    plt.title("Net Worth After 30 Years vs Split Ratio")
    plt.xlabel("Offset Split (%)")
    plt.ylabel("Net Worth (excludes property value)")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=150)

    print(f"Wrote data to {DATA_PATH}")
    print(f"Wrote chart to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
