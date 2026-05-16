# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY services/frontend/package*.json ./
RUN npm install
COPY services/frontend/ ./
RUN npm run build

# Stage 2: Build Go binaries
FROM golang:alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY services/backend/go.mod services/backend/go.sum ./
RUN go mod download
COPY services/backend/ ./
RUN go mod tidy
RUN go build -o dashboard ./cmd/dashboard
RUN go build -o orchestrator ./cmd/orchestrator

# Stage 3: Run
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata bash
WORKDIR /app

# Copy binaries
COPY --from=builder /app/dashboard /app/dashboard
COPY --from=builder /app/orchestrator /app/orchestrator

# Copy static frontend files
COPY --from=frontend-builder /app/dist ./public

# Copy start script
COPY services/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# Directories for bind mounts
RUN mkdir -p data configs

# Expose dashboard port
EXPOSE 8080

ENTRYPOINT ["./start.sh"]
