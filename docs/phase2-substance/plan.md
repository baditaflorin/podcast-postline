# Phase 2 Substance Plan

Ranked by user impact on the 10 real-data fixtures.

## Picked Substance Items

1. A1: Fuzz/parser fixture robustness for 10 real profiles and edge cases.
2. A2: Encoding and format normalization policy.
3. A3: Huge input budget and cliff documentation.
4. A4: Partial/corrupted input handling.
5. A5: Adversarial input handling.
6. B6: Auto-detect structure, meaning audio format/channel/loudness/silence shape.
7. B7: Auto-classify fields, meaning media facts, risk level, and processing intent.
8. B8: Useful first guess immediately after upload.
9. B9: Format normalization by default.
10. C11: Domain vocabulary in UI/errors.
11. C12: Domain-aware validation.
12. C14: Domain-aware export provenance.
13. C15: Podcast/audio conventions baked in.
14. D16: Confidence scores on every inference.
15. D17: Suggested fixes for wrong/risky inputs.
16. D18: Surface anomalies.
17. D19: Explain decisions.
18. F24: Enumerate reachable states.
19. F25: Every state has an exit.
20. F26: Cancellation actually cancels frontend requests.
21. F27: Defined concurrent run behavior.
22. G28: Profile fixture inference performance.
23. G31: Cache/avoid re-deriving expensive frontend state.
24. H32: Actionable errors.
25. H33: Boundary validation.
26. H34: Recoverable vs fatal errors.
27. I35: Deterministic fixture outputs.
28. I37: Debug surface via `?debug=1`.
29. I38: Output provenance.
30. J39: Remember user corrections within session.

## Implementation Order

1. Real-data fixtures and expected outputs.
2. ADRs 0040-0050.
3. Backend media preflight and inference engine.
4. Backend error taxonomy and provenance headers.
5. Backend fixture and determinism tests.
6. Frontend preflight, states, progress, cancellation, and debug surface.
7. Documentation, pass-rate tracking, postmortem, version bump.

