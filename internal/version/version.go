// Package version contains build-time metadata stamped into the server binary.
package version

var (
	// Version is the semantic application version.
	Version = "0.2.0"
	// Commit is the git commit used for the build.
	Commit = "dev"
	// Date is the UTC build timestamp.
	Date = "unknown"
)
