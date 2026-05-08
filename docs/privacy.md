# Privacy

Live site: https://baditaflorin.github.io/podcast-postline/

No analytics are enabled in v1.

The static frontend stores only local preferences in `localStorage`:

- API base URL
- target LUFS
- export format
- trim-silence preference

Uploaded audio is sent to the configured backend API when the user starts processing. The backend stores audio only in temporary files during the request and removes them after the response is sent.

No secrets are stored in the frontend.
