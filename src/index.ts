import {BaseEntity} from "./base-entity";
import {BaseExtractor} from "./base-extractor";
import path from "path";
import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";

interface Argv {
    extractor: string;
    urls: string[];
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
    .help()
    .argv as Argv;

async function runExtractor<T extends BaseEntity>(urls: string[], extractor: BaseExtractor<T>, entityType: string): Promise<void> {
    try {
        let data = [];

        for (const url of urls) {
            const result = await extractor.parsePage(url);
            const transformedResult = result.map(item => item.getInfo());

            data.push(...transformedResult);
        }

        console.log(`${entityType} - completed`);
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
    const extractorPath: string = path.join(__dirname, `./${extractorName}`);
    const extractor = require(extractorPath);
    const extractorInstance = new extractor.default();

    await runExtractor(urls, extractorInstance, extractorName);
})();
