import { argv } from 'bun';
import { existsSync } from "fs";
import path from "path";
import { BaseEntity } from "./base-entity";
import { BaseExtractor } from "./base-extractor";

interface Argv {
    extractor: string;
    urls: string[];
    headless: boolean;
    proxy: string;
}

function parseArgs(args: string[]): Argv {
    const parsed: Partial<Argv> = {};

    args.forEach(arg => {
        const [key, value] = arg.split("=");

        if (!key.startsWith("--")) return;

        const cleanKey = key.slice(2);
        if (cleanKey === "urls") {
            parsed.urls = value ? value.split(",") : [];
        } else if (cleanKey === "headless") {
            parsed.headless = value === "true";
        } else {
            (parsed as any)[cleanKey] = value;
        }
    });

    return parsed as Argv;
}

const args = parseArgs(argv.slice(2));

if (!args.extractor || !args.urls.length) {
    console.error("Usage: bun run script.ts --extractor=<name> --urls=<url1,url2,...> [--headless] [--proxy=<proxy>]");
    process.exit(1);
}

async function runExtractor<T extends BaseEntity<U>, U>(
    urls: string[], extractor: BaseExtractor<T>, extractorName: string, options: { headless?: boolean; proxy?: string; }
) {
    try {
        const results = await Promise.all(urls.map(url => extractor.parsePage(url, options)));
        const data = results.flat().map(item => item.getInfo());

        console.log(`${extractorName} - Completed`, data);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        console.log("Data saved successfully");
    }
}

(async () => {
    const extractorPath = path.join(__dirname, `../extractors`, args.extractor, "index.ts");

    if (!existsSync(extractorPath)) {
        console.error(`Extractor "${args.extractor}" not found.`);
        process.exit(1);
    }

    const { default: ExtractorClass } = await import(extractorPath);
    const extractorInstance = new ExtractorClass();

    await runExtractor(args.urls, extractorInstance, args.extractor, { headless: args.headless, proxy: args.proxy });
})();
