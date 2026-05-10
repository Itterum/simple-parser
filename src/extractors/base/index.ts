import {
  type Browser,
  type ElementHandle,
  type Page,
} from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../../utils/logger';

// Use stealth plugin
chromium.use(StealthPlugin());

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
    ],
  ): Promise<void> {
    // Block unnecessary resources
    await page.route('**/*', (route) => {
      const resource = route.request().resourceType();
      if (blockedResources.includes(resource)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Simple mouse movement to simulate human behavior
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
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await this.setupPage(page);
      await this.logRequests(page);
      
      logger.info({ url }, 'Navigating to URL');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector(this.waitSelector, { timeout: 30000 });

      const elements = await page.$$(this.waitSelector);
      logger.info({ count: elements.length }, 'Found entities to parse');

      return await Promise.all(
        elements.map((element) => this.parseEntity(element)),
      );
    } catch (error) {
      logger.error({ error, url }, 'Error during page parsing');
      return [];
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }

  async logRequests(page: Page, proxy?: string): Promise<void> {
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'document' || resourceType === 'xhr' || resourceType === 'fetch') {
        logger.debug({ 
          url: request.url(),
          method: request.method(),
          resourceType,
          proxyUsed: proxy 
        }, 'Outgoing request');
      }
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
