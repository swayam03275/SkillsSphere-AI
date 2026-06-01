import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import { expect, vi, afterEach } from 'vitest'

expect.extend(toHaveNoViolations)

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  VITE_API_URL: 'http://localhost:5000',
}))

// Mock fetch globally
globalThis.fetch = vi.fn()

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
  writable: true
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorageMock(),
  writable: true
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});
