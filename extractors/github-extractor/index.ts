import {BaseExtractor} from "../../src/base-extractor";
import {ElementHandle, Page} from "playwright";
import RepositoryEntity from "./types";

export default class GithubExtractor extends BaseExtractor<RepositoryEntity> {
    domain = "github.com";
    waitSelector = ".Box-row";

    async parseEntity(element: ElementHandle): Promise<RepositoryEntity> {
        const [
            titleElement,
            urlElement,
            descriptionElement,
            languageElement,
            countAllStarsElement,
            countStarsTodayElement,
            countForksElement,
        ] = await Promise.all([
            element.$(".h3"),
            element.$(".h3 > a"),
            element.$(".col-9"),
            element.$("[itemprop='programmingLanguage']"),
            element.$("a.Link[href$='/stargazers']"),
            element.$("span.d-inline-block.float-sm-right"),
            element.$("a.Link[href$='/forks']")
        ]);

        return new RepositoryEntity({
            title: (await titleElement?.textContent())?.trim().replace(/\s+/g, " ") || "",
            url: new URL(await urlElement?.getAttribute("href") || "", `https://${this.domain}`).href,
            description: (await descriptionElement?.textContent())?.trim() || "",
            language: (await languageElement?.textContent())?.trim() || "",
            countAllStars: parseInt((await countAllStarsElement?.textContent())?.trim().replace(",", "") || "0"),
            countStarsToday: parseInt((await countStarsTodayElement?.textContent())?.trim().replace(",", "") || "0"),
            countForks: parseInt((await countForksElement?.textContent())?.trim().replace(",", "") || "0"),
        });
    }

    async setupPage(page: Page, blockedResources: string[] = ["png", "jpeg", "jpg", "svg", "js"]): Promise<void> {
        await super.setupPage(page, blockedResources);
        await page.route(/https:\/\/avatars\.githubusercontent\.com\/.*/, (route) => route.abort());
    }
}
