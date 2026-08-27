import { registerSchema } from './register-schema';

const validInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'supersecret123',
  confirmPassword: 'supersecret123',
};

describe('registerSchema', () => {
  it('accepts valid input', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({ ...validInput, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: '1234567',
      confirmPassword: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when confirmPassword does not match password', () => {
    const result = registerSchema.safeParse({ ...validInput, confirmPassword: 'different' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });
});
