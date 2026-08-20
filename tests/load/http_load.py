#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(p * len(ordered)) - 1))
    return ordered[index]


def one(url: str, request_id: str, timeout: float) -> dict[str, Any]:
    started = time.perf_counter()
    request = urllib.request.Request(url, headers={"X-Request-Id": request_id})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        exc.read()
        status = exc.code
    except Exception as exc:  # network/timeouts are evidence, not driver crashes
        return {"status": 0, "latencyMs": (time.perf_counter() - started) * 1000, "error": type(exc).__name__}
    return {"status": status, "latencyMs": (time.perf_counter() - started) * 1000}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--timeout", type=float, default=4.0)
    parser.add_argument("--output", required=True)
    parser.add_argument("--label", default="load")
    args = parser.parse_args()

    started = time.perf_counter()
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [
            pool.submit(one, args.url, f"{args.label}-{i:04d}", args.timeout)
            for i in range(args.requests)
        ]
        for future in as_completed(futures):
            results.append(future.result())
    duration = time.perf_counter() - started
    latencies = [float(result["latencyMs"]) for result in results]
    status_counts: dict[str, int] = {}
    for result in results:
        key = str(result["status"])
        status_counts[key] = status_counts.get(key, 0) + 1
    successes = sum(count for status, count in status_counts.items() if status.startswith("2"))

    receipt = {
        "environment": "GitHub Actions ubuntu-24.04 / local Docker topology",
        "label": args.label,
        "url": args.url,
        "requests": args.requests,
        "concurrency": args.concurrency,
        "durationSeconds": round(duration, 3),
        "throughputPerSecond": round(args.requests / duration, 3) if duration else 0,
        "latencyMs": {
            "min": round(min(latencies), 3) if latencies else 0,
            "mean": round(statistics.fmean(latencies), 3) if latencies else 0,
            "p50": round(percentile(latencies, 0.50), 3),
            "p95": round(percentile(latencies, 0.95), 3),
            "p99": round(percentile(latencies, 0.99), 3),
            "max": round(max(latencies), 3) if latencies else 0,
        },
        "statusCounts": status_counts,
        "errorRate": round(1 - (successes / args.requests), 6),
        "samples": results[:20],
    }
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
