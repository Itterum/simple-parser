export interface IBaseEntity<T> {
    fields: T;

    collected: {
        date: string
    };
}

export class BaseEntity<T> implements IBaseEntity<T> {
    fields: T;
    collected: IBaseEntity<T>["collected"];

    constructor(fields: T) {
        this.fields = fields;
        this.collected = {
            date: BaseEntity.formatDate(new Date()),
        };
    }

    getInfo() {
        return {
            fields: this.fields,
            collected: this.collected,
        };
    }

    static formatDate(date: Date, timezone: string = "Europe/Moscow"): string {
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(date).replace(/\//g, "-");
    }
}
