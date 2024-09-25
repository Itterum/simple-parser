import {BaseExtractor} from "./base-extractor";
import {BaseEntity} from "./base-entity";
import {ElementHandle} from "playwright";

class RepositoryEntity extends BaseEntity {
}

export default class GitHubExtractor extends BaseExtractor<RepositoryEntity> {
    domain = "github.com";
    waitSelector = ".Box-row";

    async parseEntity(element: ElementHandle): Promise<RepositoryEntity> {
        const title = await element.$(".h3");
        const url = await element.$(".h3 > a");
        const description = await element.$(".col-9");
        const language = await element.$("[itemprop=\"programmingLanguage\"]");
        const countAllStars = await element.$("a.Link[href$=\"/stargazers\"]");
        const countStarsToday = await element.$("span.d-inline-block.float-sm-right");
        const countForks = await element.$("a.Link[href$=\"/forks\"]");

        return new RepositoryEntity({
            title: (await title?.textContent())?.trim().replace(/\s+/g, " ") || "",
            url: new URL(await url?.getAttribute("href") || "", `https://${this.domain}`).href,
            description: (await description?.textContent())?.trim() || "",
            language: (await language?.textContent())?.trim() || "",
            countAllStars: parseInt((await countAllStars?.textContent())?.trim().replace(",", "") || ""),
            countStarsToday: parseInt((await countStarsToday?.textContent())?.trim().replace(",", "") || ""),
            countForks: parseInt((await countForks?.textContent())?.trim().replace(",", "") || ""),
        });
    }
}
