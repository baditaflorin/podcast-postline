# Phase 2 Inference Performance

Date: 2026-05-09

Machine: Apple M1 Pro, darwin/arm64

Command:

```sh
CGO_ENABLED=0 go test ./internal/audio -run '^$' -bench BenchmarkInferRealDataFixtures -benchmem -count=5
```

The benchmark runs the rule-based inference engine over all 10 real-data fixture profiles per iteration.

| Run | Time per 10-fixture pass | Allocated bytes | Allocations |
| --- | -----------------------: | --------------: | ----------: |
| 1   |                 9.628 us |        12,600 B |         130 |
| 2   |                 8.685 us |        12,600 B |         130 |
| 3   |                 9.176 us |        12,600 B |         130 |
| 4   |                 8.944 us |        12,600 B |         130 |
| 5   |                 8.789 us |        12,600 B |         130 |

Median: 8.944 us for all 10 fixtures.

Worst: 9.628 us for all 10 fixtures.

Per-fixture budget from ADR 0046: under 50 ms.

Result: the fixture inference path is well under budget. Live uploads may spend additional time in `ffprobe` before the rule engine runs; the UI enters `preflighting` immediately and exposes cancellation.
