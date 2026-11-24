import { formatFullName, normalizeNamePart } from './person-name';

describe('formatFullName', () => {
  it('joins the parts and skips empty ones', () => {
    expect(formatFullName({ firstName: 'Ann', lastName: 'Smith' })).toBe('Ann Smith');
    expect(formatFullName({ firstName: 'Cher', lastName: null })).toBe('Cher');
    expect(formatFullName({ firstName: null, lastName: '' })).toBe('');
  });
});

describe('normalizeNamePart', () => {
  it('trims and turns blank values into null', () => {
    expect(normalizeNamePart('  Ann ')).toBe('Ann');
    expect(normalizeNamePart('   ')).toBeNull();
    expect(normalizeNamePart(undefined)).toBeNull();
  });
});
