# Simple Parser

A modular extractor framework using **Node.js**, **TypeScript**, and **Playwright**.
Supports multiple extractors that can be run via CLI.

---

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Itterum/simple-parser
cd simple-parser
```

2. **Install dependencies:**
```bash
npm install
npx playwright install
```

---

## Running the Project

### Development (TypeScript directly)

```bash
npm run dev -- --extractor github-extractor --urls https://github.com/trending
```

### Production (compiled JavaScript)

```bash
npm run build
node dist/cli.js --extractor github-extractor --urls https://github.com/trending
```

---

## Hybrid Architecture (Go + Node.js)

For high-concurrency tasks, use the Go orchestrator with Node.js workers.

1. **Start the Node.js worker:**
```bash
npm run worker
```

2. **Run the Go orchestrator:**
```bash
cd orchestrator
go run .
```

The orchestrator will manage the task queue in a SQLite database (`simple-parser.db`).

### Configuration (`tasks.json`)

You can define your scraping tasks in `orchestrator/tasks.json`. This supports both pre-defined extractors and a **Dynamic Extractor** that uses JSON schemas:

```json
[
  {
    "extractor": "github-extractor",
    "urls": ["https://github.com/trending"]
  },
  {
    "extractor": "dynamic-extractor",
    "urls": ["https://github.com/trending/javascript"],
    "schema": {
      "waitSelector": ".Box-row",
      "fields": {
        "title": ".h3",
        "url": { "selector": ".h3 > a", "attribute": "href" },
        "description": ".col-9",
        "language": "[itemprop='programmingLanguage']",
        "stars": { "selector": "a.Link[href$='/stargazers']", "type": "number" }
      }
    }
  }
]
```

---

## Creating a New Extractor

To add a new extractor:

1. Create a new folder in `src/extractors/` with the name of your extractor (e.g., `github`).
2. Inside this folder, create an `index.ts` file.
3. Optionally, create a `types.ts` file to define any TypeScript interfaces or types related to your extractor.

---

### Example Extractor

`types.ts` (inside `src/extractors/github/`):

```ts
import { BaseEntity, IBaseEntity } from "../base/types";

interface IRepositoryFields {
  title: string;
  url: string;
  description: string;
  language: string;
  countAllStars: number;
  countStarsToday: number;
  countForks: number;
}

export interface IRepositoryEntity extends IBaseEntity<IRepositoryFields> {
  fields: IRepositoryFields;
}

export class RepositoryEntity extends BaseEntity<IRepositoryFields> implements IRepositoryEntity {
  fields: IRepositoryFields;

  constructor(fields: IRepositoryFields) {
    super(fields);
    this.fields = fields;
  }
}
```

`index.ts` (inside `src/extractors/github/`):

```ts
import { BaseExtractor } from "../base";
import { ElementHandle } from "playwright";
import { RepositoryEntity } from "./types";

export class GithubExtractor extends BaseExtractor<RepositoryEntity> {
  domain = "github.com";
  waitSelector = ".Box-row";

  async parseEntity(element: ElementHandle): Promise<RepositoryEntity> {
    // Logic to extract data from the element
  }
}
```

---

## CLI Usage

```bash
node dist/cli.js [options]
```

### Options:
- `-e, --extractor <type>`: Extractor name (e.g., `github-extractor`)
- `-u, --urls <urls...>`: List of URLs to parse (space-separated)
- `-c, --concurrency <number>`: Number of concurrent pages (default: `1`)
- `-o, --output <path>`: Output file path (JSON)
- `-r, --retries <number>`: Number of retries for each URL (default: `3`)
- `--no-headless`: Run browser in non-headless mode
- `-p, --proxy <proxy>`: Proxy server URL
- `-h, --help`: Display help for command

### Examples:

**Parse multiple URLs concurrently:**
```bash
npm run dev -- -e github-extractor -u https://github.com/trending https://github.com/trending/javascript -c 2
```

**Save output to a file:**
```bash
npm run dev -- -e github-extractor -u https://github.com/trending -o results.json
```
