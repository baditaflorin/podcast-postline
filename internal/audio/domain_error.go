package audio

// DomainError is an actionable user-facing error.
type DomainError struct {
	Code        string `json:"code"`
	What        string `json:"what"`
	Why         string `json:"why"`
	Next        string `json:"next"`
	Recoverable bool   `json:"recoverable"`
}

func (e DomainError) Error() string {
	return e.What + ": " + e.Why
}

// BlockedError converts a blocked processing plan into a domain error.
func BlockedError(plan ProcessingPlan) DomainError {
	if len(plan.Anomalies) > 0 {
		issue := plan.Anomalies[0]
		return DomainError{
			Code:        issue.Code,
			What:        issue.Message,
			Why:         issue.Why,
			Next:        issue.Next,
			Recoverable: true,
		}
	}
	return DomainError{
		Code:        "blocked",
		What:        "Recording is not safe to process",
		Why:         "Preflight could not find a safe processing path.",
		Next:        "Choose another recording or adjust the source export.",
		Recoverable: true,
	}
}
