#! /usr/bin/env bun

import * as fs from "node:fs";
import path from "path";
import { hideBin } from "yargs/helpers";
import { pathToFileURL } from 'url';
import yargs from "yargs/yargs";
import { BaseExtractor } from "./extractors/base-extractor";
import { BaseEntity } from "./extractors/base-extractor/types";

interface Argv {
    extractor: string;
    urls: string[];
    headless: boolean;
    proxy: string;
}

type ExtractorOptions = {
    headless?: boolean;
    proxy?: string;
};

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
    options: ExtractorOptions
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

    const extractorFilePath = path.join(
        process.cwd(),
        'dist/extractors',
        `${extractorName}/index.js`
    );

    const extractorFileURL = pathToFileURL(extractorFilePath).href;

    if (!fs.existsSync(extractorFilePath)) {
        console.error(`Extractor "${extractorName}" not found in dist/.`);
        return;
    }

    const { default: ExtractorClass } = await import(extractorFileURL);
    const extractorInstance = new ExtractorClass();

    await runExtractor(urls, extractorInstance, extractorName, options);
})();
