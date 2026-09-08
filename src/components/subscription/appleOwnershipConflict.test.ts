import {
  APPLE_OWNERSHIP_CONFLICT_CODE,
  readAppleOwnershipConflict,
} from './appleOwnershipConflict';

const owned = (id = '2000001229417501') => ({
  id,
  linked: false,
  reason: APPLE_OWNERSHIP_CONFLICT_CODE,
});

describe('readAppleOwnershipConflict', () => {
  it('reports the transaction another account owns', () => {
    expect(readAppleOwnershipConflict([owned()])).toEqual({
      transactionId: '2000001229417501',
    });
  });

  it('stays clear when the device held nothing', () => {
    expect(readAppleOwnershipConflict([])).toBeNull();
  });

  it('stays clear when this account was granted something in the same restore', () => {
    const restored = [{ id: '2000000000000001', linked: true }, owned()];
    expect(readAppleOwnershipConflict(restored)).toBeNull();
  });

  it('ignores refusals that are not an ownership collision', () => {
    const restored = [
      { id: '1', linked: false, reason: 'APPLE_PRODUCT_NOT_SOLD' },
      { id: '2', linked: false, reason: 'APPLE_FAMILY_SHARED_UNSUPPORTED' },
      { id: 'unknown', linked: false, reason: 'TRUNCATED' },
    ];
    expect(readAppleOwnershipConflict(restored)).toBeNull();
  });

  it('reports the collision even when other entries failed for other reasons', () => {
    const restored = [
      { id: '1', linked: false, reason: 'bad signature' },
      owned('2000009999999999'),
    ];
    expect(readAppleOwnershipConflict(restored)).toEqual({
      transactionId: '2000009999999999',
    });
  });
});
