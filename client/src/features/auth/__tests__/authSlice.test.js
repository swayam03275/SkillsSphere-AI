import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer, {
  clearAuthError,
  setPendingVerificationEmail,
  setOAuthData,
  updateUserProfile,
  logout
} from '../authSlice';

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
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
    })
  };
})();

const sessionStorageMock = (() => {
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
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('authSlice Reducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    pendingVerificationEmail: '',
    pendingUser: null,
    loading: false,
    verificationLoading: false,
    resendLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearAuthError', () => {
    const state = { ...initialState, error: 'Some error' };
    const nextState = authReducer(state, clearAuthError());
    expect(nextState.error).toBeNull();
  });

  it('should handle setPendingVerificationEmail', () => {
    const email = ' Test@Example.com ';
    const nextState = authReducer(initialState, setPendingVerificationEmail(email));
    
    expect(nextState.pendingVerificationEmail).toBe('test@example.com');
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'skillssphere.auth.pendingEmail',
      'test@example.com'
    );
  });

  it('should handle setOAuthData', () => {
    const payload = {
      token: 'mock-token',
      user: { id: 1, name: 'Alice' },
      rememberMe: true
    };
    
    const nextState = authReducer(initialState, setOAuthData(payload));
    
    expect(nextState.token).toBe('mock-token');
    expect(nextState.user).toEqual({ id: 1, name: 'Alice' });
    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.loading).toBe(false);
    expect(nextState.error).toBeNull();
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith('skillssphere.auth.token', 'mock-token');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('skillssphere.auth.user', JSON.stringify(payload.user));
  });

  it('should handle updateUserProfile', () => {
    const state = { ...initialState, user: { id: 1, name: 'Alice' } };
    const payload = { id: 1, name: 'Alice Bob' };
    
    // Setup local storage to simulate logged in user
    window.localStorage.setItem('skillssphere.auth.token', 'mock-token');
    
    const nextState = authReducer(state, updateUserProfile(payload));
    
    expect(nextState.user).toEqual(payload);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('skillssphere.auth.user', JSON.stringify(payload));
  });

  it('should handle logout.fulfilled', () => {
    const state = {
      ...initialState,
      token: 'mock-token',
      user: { id: 1 },
      isAuthenticated: true
    };
    
    const nextState = authReducer(state, { type: logout.fulfilled.type });
    
    expect(nextState.user).toBeNull();
    expect(nextState.token).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
  });
});
