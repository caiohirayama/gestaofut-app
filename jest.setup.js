process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
