# temp

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Itterum/simple-parser
   cd simple-parser 
   ```

2. **Install dependencies:**
   ```bash
   bun install
   bunx playwright install
   ```

### Creating a New Extractor

To add a new extractor:
1. Create a new folder in `extractors/` with a name corresponding to your extractor (e.g., `github-extractor`).
2. Inside this folder, create an `index.ts` file.
3. Optionally, create a `types.ts` file to define any TypeScript interfaces or types related to your extractor for better organization.

### Example Extractor

`types.ts` (inside extractors/github-extractor/):

```typescript
import {BaseEntity, IBaseEntity} from "../base-extractor/types";

interface IRepositoryFields {
    title: string;
    url: string;
    description: string;
    language: string;
    countAllStars: number;
    countStarsToday: number;
    countForks: number;
}

interface IRepositoryEntity extends IBaseEntity<IRepositoryFields> {
    fields: IRepositoryFields;
}

export default class RepositoryEntity extends BaseEntity<IRepositoryFields> implements IRepositoryEntity {
    fields: IRepositoryFields;

    constructor(fields: IRepositoryFields) {
        super(fields);
        this.fields = fields;
    }
}
```

`index.ts` (inside extractors/github-extractor/):

```typescript
import {BaseExtractor} from "../base-extractor";
import {ElementHandle, Page} from "playwright";
import RepositoryEntity from "./types";

export default class GithubExtractor extends BaseExtractor<RepositoryEntity> {
    domain = 'github.com';
    waitSelector = '.Box-row';

    async parseEntity(element: ElementHandle): Promise<RepositoryEntity> {
        // Logic to extract data
    }
}
```

### Running the Project

```bash
  bun run build.js
  node dist/index.js --extractor github-extractor --urls https://github.com/trending
```

### Future Support for Bun with Playwright

Bun is rapidly evolving and aims to support more features, including better compatibility with Playwright and other browser automation tools. We are tracking updates to Bun for better Playwright support, which will enable seamless integration for browser automation and extraction tasks directly within the Bun environment.

Until Bun provides full support for Playwright, we recommend using Node.js for the actual browser automation while leveraging Bun for faster bundling and code execution.
