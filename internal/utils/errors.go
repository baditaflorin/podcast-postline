// Package utils contains small shared utility helpers.
package utils

import "log/slog"

// HandleErrorOrLogWithMessages logs an error or success message and reports whether an error occurred.
func HandleErrorOrLogWithMessages(err error, errMsg, successMsg string) bool {
	if err != nil {
		slog.Error(errMsg, "error", err)
		return true
	}
	if successMsg != "" {
		slog.Info(successMsg)
	}
	return false
}
