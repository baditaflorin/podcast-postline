# Phase 3 Stranger Test

Date: 2026-05-10

Tester: self-run in a fresh Playwright/private-browser style session. No external tester was available during this autonomous pass, so this is weaker than a real other-human test.

## Scenario

1. Open the Pages preview cold.
2. Load the generated sample.
3. Add two local audio files through the picker.
4. Export workspace state.
5. Import workspace state in a fresh session.
6. Create a share link.
7. Process the active sample through mocked backend responses.
8. Copy/download provenance and inspect snippets.
9. Start fresh.

## Findings

| Finding                                                                | Severity | Response                                                                     |
| ---------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| A normal one-job workspace was too large for the first share-link cap. | High     | Raised the cap to 8000 characters and added Playwright coverage.             |
| Mocked cross-origin responses initially hid provenance headers.        | Medium   | Updated e2e routes to model production CORS header exposure.                 |
| Imported metadata could be mistaken for a ready-to-process local file. | Medium   | Imported jobs remain in `Reattach audio` state and the reset path is tested. |

## Result

The self-run stranger test passes for the primary workflow. The app is usable for a stranger who has local audio files and a reachable backend. It is still not zero-help for someone who only has a private cloud URL; that remains explicitly out of scope because browser CORS makes it unreliable.
