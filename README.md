# Simple Parser

A modular extractor framework using **Node.js**, **TypeScript**, **Playwright**, and **Golang**.
This project uses a hybrid architecture: Node.js handles browser automation, while Go manages the orchestration and task queue.

---

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Itterum/simple-parser
cd simple-parser
```

2. **Install Node.js dependencies:**
```bash
npm install
npx playwright install
```

3. **Install Go dependencies:**
```bash
cd orchestrator
go mod download
cd ..
```

---

## Running the Project

### 1. Start the Node.js worker (Browser Engine)
The Node.js part of the project acts as a stateless worker that performs the actual browser automation.

```bash
npm run worker
```

### 2. Use the Go CLI / Orchestrator
The Go application is the primary entry point for the project.

#### Orchestrator Mode (Batch processing from `tasks.json`)
```bash
cd orchestrator
go run .
```

#### Single Run Mode (CLI)
```bash
cd orchestrator
go run . --extractor github-extractor --url https://github.com/trending
```

---

## CLI Options (Go)

- `--extractor <name>`: Name of the extractor to use.
- `--url <url>`: URL to parse.
- `--concurrency <num>`: Number of concurrent tasks (default: `2`).
- `--config <path>`: Path to the tasks JSON configuration (default: `tasks.json`).
- `--db <path>`: Path to the SQLite database (default: `simple-parser.db`).
- `--worker <url>`: Node.js worker URL (default: `http://localhost:3000`).

---

## Configuration (`tasks.json`)

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
