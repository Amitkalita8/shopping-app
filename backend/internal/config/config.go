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
}

func Load() Config {
	port := strings.TrimSpace(os.Getenv("PORT"))
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
	}
}
