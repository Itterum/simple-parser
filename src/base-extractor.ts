import {chromium, ElementHandle, Page} from "playwright";

interface IExtractor<T> {
    waitSelector: string;
    domain: string;

    parseEntity(element: ElementHandle): Promise<T>;

    setupPage(page: Page, blockedResources: string[]): Promise<void>;

    parsePage(url: string, options?: { headless?: boolean; proxy?: string }): Promise<T[]>;

    logRequests(page: Page, proxy: string): Promise<void>;

    scrollToEnd(page: Page): Promise<void>;
}

export abstract class BaseExtractor<T> implements IExtractor<T> {
    abstract waitSelector: string;
    abstract domain: string;

    abstract parseEntity(element: ElementHandle): Promise<T>

    async setupPage(page: Page, blockedResources: string[] = ["png", "jpeg", "jpg", "svg"]): Promise<void> {
        await page.route(new RegExp(`(${blockedResources.join("|")})$`), (route) => route.abort());
    }

    async parsePage(url: string, options: { headless?: boolean; proxy?: string } = {headless: true}): Promise<T[]> {
        const browser = await chromium.launch({headless: options.headless});
        const page = await browser.newPage();

        if (options.proxy) {
            await page.setExtraHTTPHeaders({"X-Proxy": options.proxy});
        }

        try {
            await this.setupPage(page);
            await this.logRequests(page);
            await page.goto(url, {waitUntil: "domcontentloaded"});
            await page.waitForSelector(this.waitSelector);

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
}
