package config

import (
	"os"
	"strings"
)

const defaultPort = "8080"
const defaultFrontendOrigin = "http://localhost:3000"

type Config struct {
	Port           string
	DatabaseURL    string
	FrontendOrigin string
	AuthSecret     string
	GoogleClientID string
}

// loadDotEnv reads KEY=VALUE lines from path into the process environment.
// Variables that are already set are left untouched, and a missing file is ignored.
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)

		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func Load() Config {
	loadDotEnv(".env")

	port :=strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = defaultPort
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))

	frontendOrigin := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if frontendOrigin == "" {
		frontendOrigin = defaultFrontendOrigin
	}

	return Config{
		Port:           port,
		DatabaseURL:    databaseURL,
		FrontendOrigin: frontendOrigin,
		AuthSecret:     strings.TrimSpace(os.Getenv("AUTH_SECRET")),
		GoogleClientID: strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID")),
	}
}
