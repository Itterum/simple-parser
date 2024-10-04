import {BaseEntity} from "./base-entity";
import {BaseExtractor} from "./base-extractor";
import path from "path";
import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";
import * as fs from "node:fs";

interface Argv {
    extractor: string;
    urls: string[];
    headless: boolean;
    proxy: string;
}

const argv: Argv = yargs(hideBin(process.argv))
    .option("extractor", {
        alias: "e",
        type: "string",
        description: "Name of the extractor",
        demandOption: true,
    })
    .option("urls", {
        alias: "u",
        type: "array",
        description: "List of URLs to extract data from",
        demandOption: true,
    })
    .option("headless", {
        alias: "h",
        type: "boolean",
        description: "Run headless browser",
        default: false,
    })
    .option("proxy", {
        alias: "p",
        type: "string",
        description: "Parse with proxy",
    })
    .help()
    .argv as Argv;

async function runExtractor<T extends BaseEntity<U>, U>(
    urls: string[],
    extractor: BaseExtractor<T>,
    extractorName: string,
    options: { headless?: boolean; proxy?: string }
): Promise<void> {
    try {
        let data = [];

        for (const url of urls) {
            const result: T[] = await extractor.parsePage(url, options);
            const transformedResult = result.map(item => item.getInfo());

            data.push(...transformedResult);
        }

        console.log(`${extractorName} - completed`);
        console.log(data);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        console.log("Data saved successfully");
    }
}

(async () => {
    const urls: string[] = argv.urls;
    const extractorName: string = argv.extractor;
    const options = {
        headless: argv.headless,
        proxy: argv.proxy,
    };

    const extractorDir = path.join(__dirname, `../extractors`);

    let extractorFilePath: string | null = null;

    const directories = fs.readdirSync(extractorDir, {withFileTypes: true});

    for (const dir of directories) {
        if (dir.isDirectory()) {
            const potentialPath = path.join(extractorDir, dir.name, "index.js");
            if (dir.name === extractorName && fs.existsSync(potentialPath)) {
                extractorFilePath = potentialPath;
                break;
            }
        }
    }

    if (!extractorFilePath) {
        console.error(`Extractor "${extractorName}" not found.`);
        return;
    }

    const extractorModule = await import(extractorFilePath);
    const extractorInstance = new extractorModule.default();

    await runExtractor(urls, extractorInstance, extractorName, options);
})();
