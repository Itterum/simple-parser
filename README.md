### Installation

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

### Creating a New Extractor

To add a new extractor:

1. Create a file in `src/` with a name and content similar to `git-hubExtractor.ts`.
2. Define an extractor class that extends `BaseExtractor` and implement the `parseEntity` method for data extraction.

### Example Extractor

```typescript
import {BaseExtractor} from './baseExtractor';
import {BaseEntity} from './baseEntity';
import {ElementHandle} from 'playwright';

class RepositoryEntity extends BaseEntity {
}

export default class GitHubExtractor extends BaseExtractor<RepositoryEntity> {
    domain = 'github.com';
    waitSelector = '.Box-row';
    pager = {
        end: '.footer',
    };

    async parseEntity(element: ElementHandle): Promise<RepositoryEntity> {
        // Logic to extract data
    }
}
```

### Running the Project

```bash
  npm run build
  node dist/index.js --extractor github-extractor --urls https://github.com/trending
```
