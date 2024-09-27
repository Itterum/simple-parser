import {BaseEntity, IBaseEntity} from "../../src/base-entity";

interface IRepositoryFields {
    title: string;
    url: string;
    description: string;
    language: string;
    countAllStars: number;
    countStarsToday: number;
    countForks: number;
}

interface IRepositoryEntity extends IBaseEntity<IRepositoryFields> {
    fields: IRepositoryFields;
}

export default class RepositoryEntity extends BaseEntity<IRepositoryFields> implements IRepositoryEntity {
    fields: IRepositoryFields;

    constructor(fields: IRepositoryFields) {
        super(fields);
        this.fields = fields;
    }
}
