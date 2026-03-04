import { describe, it, expect } from 'vitest';
import { createAuthHelper } from './auth-helper';

describe('createAuthHelper', () => {
  it('returns onAuth callback with token credentials', () => {
    const { onAuth } = createAuthHelper('gho_test123');
    const result = onAuth();

    expect(result).toEqual({
      username: 'x-access-token',
      password: 'gho_test123',
    });
  });

  it('uses the provided token in password field', () => {
    const { onAuth } = createAuthHelper('my-secret-token');
    expect(onAuth().password).toBe('my-secret-token');
  });
});
