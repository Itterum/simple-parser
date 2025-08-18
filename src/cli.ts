#!/usr/bin/env node
import { extractors } from './extractors/extractors';

const args = process.argv.slice(2);

function parseArgs(args: string[]) {
  const opts: Record<string, string | string[]> = {};
  let key: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      key = arg.slice(2);
      opts[key] = [];
    } else if (key) {
      if (Array.isArray(opts[key])) {
        (opts[key] as string[]).push(arg);
      } else {
        opts[key] = arg;
      }
    }
  }
  return opts;
}

(async () => {
  const opts = parseArgs(args);
  const extractorName = opts['extractor'] as string;
  const urls = opts['urls'] as string[];

  if (!extractorName || !urls) {
    console.error(
      'Usage: node dist/cli.js --extractor github-extractor --urls <url1> <url2>',
    );
    process.exit(1);
  }

  const extractor = extractors[extractorName];
  if (!extractor) {
    console.error(`Extractor "${extractorName}" not found`);
    process.exit(1);
  }

  for (const url of urls) {
    try {
      const data = await extractor.parsePage(url, {});
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Failed to extract from ${url}:`, err);
    }
  }
})();
