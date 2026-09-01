process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Deterministic defaults for the upload flow (docs/uploads.md) — individual
// tests override these with jest.spyOn/mockResolvedValue as needed.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri) => ({
    uri,
    size: 1024,
    createUploadTask: jest.fn(() => ({
      uploadAsync: jest.fn(async () => ({ status: 200, body: '', headers: {} })),
    })),
  })),
}));
