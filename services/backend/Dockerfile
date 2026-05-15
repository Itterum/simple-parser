# Stage 1: Build binaries
FROM golang:alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Ensure go.mod is consistent
RUN go mod tidy

# Build binaries
RUN go build -o dashboard ./cmd/dashboard
RUN go build -o orchestrator ./cmd/orchestrator

# Stage 2: Run
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata bash

WORKDIR /app

# Copy binaries from builder
COPY --from=builder /app/dashboard /app/dashboard
COPY --from=builder /app/orchestrator /app/orchestrator

# Copy templates
COPY templates ./templates

# Copy start script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Directories for bind mounts
RUN mkdir -p data configs

# Expose dashboard port
EXPOSE 8080

ENTRYPOINT ["./start.sh"]
