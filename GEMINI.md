# Simple Parser - Project Knowledge

## Project Overview
A modular web scraper framework using Playwright and TypeScript. It follows an OOP approach with base classes for extractors and data entities.

## Architecture
- **Hybrid Model**: The project uses a Go backend to manage state and Node.js workers for browser automation.
- **`services/backend/` (Go)**: Monolithic backend with multiple entry points.
  - `cmd/orchestrator/`: Central management and task distribution.
  - `cmd/dashboard/`: HTMX-based web UI for monitoring, metrics, and task management.
  - `internal/db/`: Unified SQLite schema and operations.
  - `internal/scheduler/`: Concurrent task distribution via goroutines.
- **`services/worker/` (Node.js)**: Stateless HTTP worker.
  - Exposes `POST /api/v1/extract` to run Playwright extractors.
- **`configs/tasks.json`**: Configuration file defining what URLs to parse and which extractors/schemas to use.
- **`data/`**: Directory for the SQLite database (`simple-parser.db`).

## Interaction Flow
1. Go orchestrator or Dashboard (UI) triggers task processing.
2. Dashboard provides real-time metrics and task status updates via HTMX.
3. Go pulls "pending" tasks from SQLite.
4. Go sends an HTTP request (including optional extraction schema) to the Node.js worker.
5. Node.js runs Playwright (using either a hardcoded or dynamic extractor), extracts data, and returns JSON.
6. Go saves the result and updates the task status in SQLite.

## Key Conventions
- **Extractors**: Must extend `BaseExtractor` and implement `parseEntity`.
- **Entities**: Usually defined in a `types.ts` within the extractor's folder, extending `BaseEntity`.
- **Naming**: Extractor names in the registry usually follow the `<name>-extractor` pattern.
- **Services**: All components are located in the `services/` directory.

## Implementation Details
- **Anti-Bot**: Uses manual overrides for `navigator.webdriver`, custom User-Agent, and basic mouse movements.
- **Resource Blocking**: Blocks images, stylesheets, etc., by default in `BaseExtractor.setupPage`.
- **CLI**: Orchestrator supports CLI flags for single runs and batch mode.

## Planned Improvements
1. **CLI Enhancement**: [DONE] Switched to `commander` for better argument handling and help generation.
2. **Concurrency**: [DONE] Implemented parallel page processing using `p-limit`.
3. **Logging**: [DONE] Integrated `pino` for structured logging.
4. **Output Handling**: [DONE] Added `-o, --output` option to save results to JSON files.
5. **Stealth**: [DONE] Integrated `playwright-extra` and `puppeteer-extra-plugin-stealth` for advanced anti-bot evasion.
6. **Error Handling**: [DONE] Implemented retry logic with exponential backoff in `BaseExtractor`.
7. **Dashboard UX**: [DONE] Added metrics, task controls (Run/Reset), and JSON data visualization.
8. **Unified Backend**: [DONE] Merged orchestrator and dashboard into a single Go module with shared logic.
9. **Testing**: [DONE] Set up `Jest` and added initial unit tests for core entities.

## Testing
- **Framework**: `Jest` with `ts-jest`.
- **Location**: `services/worker/src/__tests__/`.
- **Command**: `npm test` (inside `services/worker/`).
