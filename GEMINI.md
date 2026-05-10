# Simple Parser - Project Knowledge

## Project Overview
A modular web scraper framework using Playwright and TypeScript. It follows an OOP approach with base classes for extractors and data entities.

## Architecture
- **Hybrid Model**: The project uses a Go orchestrator to manage state and Node.js workers for browser automation.
- **`orchestrator/` (Go)**: Central management.
  - `database.go`: SQLite schema and operations.
  - `scheduler.go`: Highly concurrent task distribution via goroutines.
- **`src/server.ts` (Node.js)**: Stateless HTTP worker.
  - Exposes `POST /api/v1/extract` to run Playwright extractors.
- **`src/extractors/base/`**: Base logic for Playwright-based scraping.
- **`src/extractors/`**: Specific website implementations.

## Interaction Flow
1. Go orchestrator pulls "pending" tasks from SQLite.
2. Go sends an HTTP request to the Node.js worker.
3. Node.js runs Playwright, extracts data, and returns JSON.
4. Go saves the result and updates the task status in SQLite.

## Key Conventions
- **Extractors**: Must extend `BaseExtractor` and implement `parseEntity`.
- **Entities**: Usually defined in a `types.ts` within the extractor's folder, extending `BaseEntity`.
- **Naming**: Extractor names in the registry usually follow the `<name>-extractor` pattern.

## Implementation Details
- **Anti-Bot**: Uses manual overrides for `navigator.webdriver`, custom User-Agent, and basic mouse movements.
- **Resource Blocking**: Blocks images, stylesheets, etc., by default in `BaseExtractor.setupPage`.
- **CLI**: Manual argument parsing in `src/cli.ts`.

## Planned Improvements
1. **CLI Enhancement**: [DONE] Switched to `commander` for better argument handling and help generation.
2. **Concurrency**: [DONE] Implemented parallel page processing using `p-limit`.
3. **Logging**: [DONE] Integrated `pino` for structured logging.
4. **Output Handling**: [DONE] Added `-o, --output` option to save results to JSON files.
5. **Stealth**: [DONE] Integrated `playwright-extra` and `puppeteer-extra-plugin-stealth` for advanced anti-bot evasion.
6. **Error Handling**: [DONE] Implemented retry logic with exponential backoff in `BaseExtractor`.
7. **Types**: [DONE] Refactored CLI argument parsing using `commander`'s built-in type handling.
8. **Testing**: [DONE] Set up `Jest` and added initial unit tests for core entities.

## Testing
- **Framework**: `Jest` with `ts-jest`.
- **Location**: `src/__tests__/`.
- **Command**: `npm test`.
