import '@testing-library/jest-dom';

// Mock import.meta for Vite environment variables
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3001/api',
        VITE_WS_URL: 'http://localhost:3001',
        VITE_NODE_ENV: 'test'
      }
    }
  },
  writable: true
});

// Mock TextEncoder/TextDecoder
class MockTextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Buffer.from(input));
  }
}

class MockTextDecoder {
  decode(input?: Uint8Array): string {
    return input ? Buffer.from(input).toString() : '';
  }
}

global.TextEncoder = MockTextEncoder as any;
global.TextDecoder = MockTextDecoder as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 