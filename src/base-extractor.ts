import {chromium, ElementHandle, Page} from "playwright";

interface IExtractor<T> {
    waitSelector: string;
    domain: string;
    pager?: {
        start?: string,
        end: string,
    };

    logRequests(page: Page, proxy: string): Promise<void>;

    parseEntity(element: ElementHandle): Promise<T>;

    scrollToEnd(page: Page): Promise<void>;

    parsePage(url: string): Promise<T[]>;
}

export abstract class BaseExtractor<T> implements IExtractor<T> {
    abstract waitSelector: string;
    abstract domain: string;

    abstract parseEntity(element: ElementHandle): Promise<T>

    pager?: {
        start?: string,
        end: string,
    };

    async scrollToEnd(page: Page): Promise<void> {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < 10; i++) {
            const previousHeight = await page.evaluate("document.body.scrollHeight");
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await delay(2000);
            const newHeight = await page.evaluate("document.body.scrollHeight");
            if (newHeight === previousHeight) break;
        }
    }

    async logRequests(page: Page, proxy?: string): Promise<void> {
        page.on("request", (request) => {
            const requestInfo = {
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                proxyUsed: proxy,
            };

            console.log("Request Info:", requestInfo);
        });
    }

    async parsePage(url: string): Promise<T[]> {
        const browser = await chromium.launch({headless: true});
        const page = await browser.newPage();

        try {
            await this.setupPage(page);
            await this.logRequests(page);
            await page.goto(url);
            await page.waitForSelector(this.waitSelector);

            if (this.pager?.start) {
                await this.navigateThroughPages(page);
            }

            await this.scrollToEnd(page);

            const elements = await page.$$(this.waitSelector);

            return await Promise.all(elements.map(element => this.parseEntity(element)));
        } catch (error) {
            console.error(error);
            return [];
        } finally {
            await page.close();
            await browser.close();
        }
    }

    private async setupPage(page: Page): Promise<void> {
        await page.route(/(png|jpeg|jpg|svg)$/, route => route.abort());
    }

    private async navigateThroughPages(page: Page): Promise<void> {
        while (true) {
            if (this.pager?.start) {
                try {
                    await page.click(`text=${this.pager.start}`);
                } catch (error) {
                    console.log(`No more pages found for selector: ${this.pager.start}`);
                    break;
                }
            }

            const allEntitiesShown = await page.$(this.pager?.end ?? "");

            if (allEntitiesShown) {
                break;
            }
        }
    }
}
