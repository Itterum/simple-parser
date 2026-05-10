import { BaseEntity } from '../extractors/base/types';

describe('BaseEntity', () => {
  it('should format date correctly', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    const formatted = BaseEntity.formatDate(date, 'UTC');
    // Expected format: DD-MM-YYYY, HH:mm:ss
    expect(formatted).toBe('10-05-2026, 12:00:00');
  });

  it('should initialize with correct fields and date', () => {
    const fields = { title: 'Test' };
    const entity = new BaseEntity(fields);
    expect(entity.fields).toEqual(fields);
    expect(entity.collected.date).toMatch(/^\d{2}-\d{2}-\d{4}, \d{2}:\d{2}:\d{2}$/);
  });

  it('should return correct info via getInfo()', () => {
    const fields = { title: 'Test' };
    const entity = new BaseEntity(fields);
    const info = entity.getInfo();
    expect(info.fields).toEqual(fields);
    expect(info.collected).toEqual(entity.collected);
  });
});
