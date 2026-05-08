package utils

import "log/slog"

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
