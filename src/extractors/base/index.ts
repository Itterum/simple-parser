import {
  type Browser,
  chromium,
  type ElementHandle,
  type Page,
} from 'playwright';

interface IExtractor<T> {
  waitSelector: string;
  domain: string;

  parseEntity(element: ElementHandle): Promise<T>;

  setupPage(page: Page, blockedResources: string[]): Promise<void>;

  launchBrowser(headless?: boolean, proxy?: string): Promise<Browser>;

  parsePage(
    url: string,
    options?: { headless?: boolean; proxy?: string },
  ): Promise<T[]>;

  logRequests(page: Page, proxy: string): Promise<void>;

  scrollToEnd(page: Page): Promise<void>;
}

export abstract class BaseExtractor<T> implements IExtractor<T> {
  abstract waitSelector: string;
  abstract domain: string;

  abstract parseEntity(element: ElementHandle): Promise<T>;

  async setupPage(
    page: Page,
    blockedResources: string[] = [
      'image',
      'stylesheet',
      'font',
      'media',
      'script',
    ],
  ): Promise<void> {
    await page.route('**/*', (route) => {
      const resource = route.request().resourceType();
      if (blockedResources.includes(resource)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(window, 'chrome', {
        get: () => ({ runtime: {} }),
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    await page.exposeFunction('realisticMouseMove', async () => {
      await page.mouse.move(100, 100, { steps: 20 });
      await page.mouse.move(300, 200, { steps: 15 });
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    });

    await page.mouse.move(100, 100, { steps: 10 });
    await page.mouse.move(250, 200, { steps: 15 });
  }

  async launchBrowser(
    headless: boolean = true,
    proxy?: string,
  ): Promise<Browser> {
    return chromium.launch({
      headless,
      proxy: proxy ? { server: proxy } : undefined,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  async parsePage(
    url: string,
    options: { headless?: boolean; proxy?: string },
  ): Promise<T[]> {
    const browser = await this.launchBrowser(options.headless, options.proxy);
    const page = await browser.newPage();

    try {
      await this.setupPage(page);
      await this.logRequests(page);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(this.waitSelector);

      const elements = await page.$$(this.waitSelector);

      return await Promise.all(
        elements.map((element) => this.parseEntity(element)),
      );
    } catch (error) {
      console.error('Error during page parsing:', error);
      return [];
    } finally {
      await page.close();
      await browser.close();
    }
  }

  async logRequests(page: Page, proxy?: string): Promise<void> {
    page.on('request', (request) => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        proxyUsed: proxy,
      };

      console.log('Request Info:', requestInfo);
    });
  }

  async scrollToEnd(
    page: Page,
    maxAttempts: number = 10,
    delayMs: number = 2000,
  ): Promise<void> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < maxAttempts; i++) {
      const previousHeight = await page.evaluate(
        () => document.body.scrollHeight,
      );
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(delayMs);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) break;
    }
  }
}
