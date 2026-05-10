#!/usr/bin/env node
import { Command } from 'commander';
import pLimit from 'p-limit';
import * as fs from 'fs/promises';
import { extractors } from './extractors/extractors';
import logger from './utils/logger';

const program = new Command();

program
  .name('simple-parser')
  .description('A modular web scraper framework using Playwright and TypeScript')
  .version('1.0.0');

program
  .requiredOption('-e, --extractor <type>', 'extractor name (e.g., github-extractor)')
  .requiredOption('-u, --urls <urls...>', 'list of URLs to parse')
  .option('-c, --concurrency <number>', 'number of concurrent pages', '1')
  .option('-o, --output <path>', 'output file path (JSON)')
  .option('-r, --retries <number>', 'number of retries for each URL', '3')
  .option('--no-headless', 'run browser in non-headless mode')
  .option('-p, --proxy <proxy>', 'proxy server URL')
  .action(async (options) => {
    const { extractor: extractorName, urls, headless, proxy, concurrency, output, retries } = options;
    const limit = pLimit(parseInt(concurrency));
    const maxRetries = parseInt(retries);

    const extractor = extractors[extractorName];
    if (!extractor) {
      logger.error(`Extractor "${extractorName}" not found.`);
      logger.info(`Available extractors: ${Object.keys(extractors).join(', ')}`);
      process.exit(1);
    }

    logger.info(`Starting extraction using ${extractorName} (concurrency: ${concurrency}, retries: ${maxRetries})...`);

    const tasks = urls.map((url: string) => 
      limit(async () => {
        try {
          logger.info(`Processing: ${url}`);
          const data = await extractor.parsePage(url, { headless, proxy, retries: maxRetries });
          return { url, data, success: true };
        } catch (err) {
          logger.error({ err, url }, 'Failed to extract from URL');
          return { url, error: err, success: false };
        }
      })
    );

    const results = await Promise.all(tasks);
    
    const successfulResults = results.filter(r => r.success).map(r => r.data).flat();
    
    if (output) {
      try {
        await fs.writeFile(output, JSON.stringify(successfulResults, null, 2));
        logger.info(`Results saved to ${output}`);
      } catch (err) {
        logger.error({ err, output }, 'Failed to save results to file');
      }
    } else {
      console.log(JSON.stringify(successfulResults, null, 2));
    }
    
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      logger.warn(`Completed with ${failures.length} errors.`);
    } else {
      logger.info('Extraction completed successfully.');
    }
  });

program.parse(process.argv);
