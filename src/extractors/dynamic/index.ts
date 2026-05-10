import { ElementHandle } from 'playwright';
import { BaseExtractor } from '../base';
import { BaseEntity } from '../base/types';

export interface DynamicSchema {
  waitSelector: string;
  fields: Record<string, string | { selector: string; attribute?: string; type?: 'text' | 'number' }>;
}

export class DynamicExtractor extends BaseExtractor<BaseEntity<any>> {
  domain = 'dynamic';
  waitSelector = '';
  schema: DynamicSchema | null = null;

  setSchema(schema: DynamicSchema) {
    this.schema = schema;
    this.waitSelector = schema.waitSelector;
  }

  async parseEntity(element: ElementHandle): Promise<BaseEntity<any>> {
    if (!this.schema) throw new Error('Schema not set for DynamicExtractor');

    const fields: Record<string, any> = {};

    for (const [fieldName, config] of Object.entries(this.schema.fields)) {
      const selector = typeof config === 'string' ? config : config.selector;
      const attr = typeof config === 'object' ? config.attribute : undefined;
      const type = typeof config === 'object' ? config.type : 'text';

      const el = await element.$(selector);
      let value: string | null = null;

      if (attr) {
        value = await el?.getAttribute(attr) || null;
      } else {
        value = (await el?.textContent())?.trim() || null;
      }

      if (type === 'number' && value) {
        fields[fieldName] = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
      } else {
        fields[fieldName] = value || '';
      }
    }

    return new BaseEntity(fields);
  }

  // Override parsePage to accept schema from options
  async parsePage(
    url: string,
    options: { headless?: boolean; proxy?: string; retries?: number; schema?: DynamicSchema },
  ): Promise<BaseEntity<any>[]> {
    if (options.schema) {
      this.setSchema(options.schema);
    }
    return super.parsePage(url, options);
  }
}
