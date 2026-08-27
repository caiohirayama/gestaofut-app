import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(result.success).toBe(false);
  });
});
