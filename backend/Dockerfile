# Builds the Go API into a small image that runs anywhere Docker does
# (Render, Railway, Fly.io, Google Cloud Run, a plain VPS, ...).
FROM golang:1.25-alpine AS build
WORKDIR /src

# Dependencies first, so they stay cached until go.mod changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

# distroless carries CA certificates (needed to verify Google sign-in and TLS databases) and runs as non-root.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server

# Hosts inject PORT; the server listens on it (8080 when unset).
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/server"]
