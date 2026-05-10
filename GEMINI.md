# Simple Parser - Project Knowledge

## Project Overview
A modular web scraper framework using Playwright and TypeScript. It follows an OOP approach with base classes for extractors and data entities.

## Architecture
- **`src/extractors/base/`**: Contains `BaseExtractor` (abstract class) and `BaseEntity`. These provide common functionality like browser launching, page setup (anti-bot), and resource blocking.
- **`src/extractors/`**: Specific implementations of extractors (e.g., `github`).
- **`src/cli.ts`**: Entry point for CLI usage.
- **`src/extractors/extractors.ts`**: Registry of available extractors.

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
5. **Stealth**: Evaluate `playwright-extra` and `stealth-plugin`.
6. **Error Handling**: [IMPROVED] More granular error reporting via `pino`.
7. **Types**: [DONE] Refactored CLI argument parsing using `commander`'s built-in type handling.
