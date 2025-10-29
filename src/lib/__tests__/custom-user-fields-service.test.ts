/**
 * Unit tests for custom-user-fields-service.ts
 */

import { CustomUserFieldsService } from '../custom-user-fields-service';

describe('CustomUserFieldsService', () => {
  let svc: CustomUserFieldsService;

  beforeEach(() => {
    svc = new CustomUserFieldsService();
  });

  it('defines and lists fields', () => {
    const def = svc.defineField({ name: 'twitter', type: 'string', maxLength: 15 });
    expect(def.valid).toBe(true);
    const defs = svc.listFields();
    expect(defs.find((d) => d.name === 'twitter')).toBeTruthy();
  });

  it('validates required and types', () => {
    svc.defineField({ name: 'age', type: 'number', required: true });
    svc.defineField({ name: 'optIn', type: 'boolean' });
    svc.defineField({ name: 'color', type: 'enum', allowedValues: ['red', 'blue'] });

    const ok = svc.validate({ age: 30, optIn: true, color: 'red' });
    expect(ok.valid).toBe(true);

    const bad = svc.validate({ age: 'thirty', color: 'green' });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('age'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('color'))).toBe(true);
  });

  it('enforces string maxLength', () => {
    svc.defineField({ name: 'twitter', type: 'string', maxLength: 10 });
    const res = svc.validate({ twitter: 'this_is_longer_than_10' });
    expect(res.valid).toBe(false);
  });
});
