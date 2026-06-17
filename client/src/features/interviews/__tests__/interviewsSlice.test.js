import { describe, it, expect } from 'vitest';
import interviewsReducer, {
  clearInterviewsError,
  fetchInterviewHistory
} from '../interviewsSlice';

describe('interviewsSlice Reducer', () => {
  const initialState = {
    sessions: [],
    analytics: null,
    pagination: { page: 1, pages: 1, total: 0 },
    isLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(interviewsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearInterviewsError', () => {
    const state = { ...initialState, error: 'API Error' };
    const nextState = interviewsReducer(state, clearInterviewsError());
    expect(nextState.error).toBeNull();
  });

  it('should handle fetchInterviewHistory.pending', () => {
    const nextState = interviewsReducer(initialState, { type: fetchInterviewHistory.pending.type });
    expect(nextState.isLoading).toBe(true);
    expect(nextState.error).toBeNull();
  });

  it('should handle fetchInterviewHistory.fulfilled', () => {
    const payload = {
      sessions: [{ id: 1, role: 'Frontend' }],
      analytics: { totalScore: 85 },
      pagination: { page: 1, pages: 2, total: 15 }
    };
    
    const nextState = interviewsReducer(initialState, {
      type: fetchInterviewHistory.fulfilled.type,
      payload
    });
    
    expect(nextState.isLoading).toBe(false);
    expect(nextState.sessions).toEqual(payload.sessions);
    expect(nextState.analytics).toEqual(payload.analytics);
    expect(nextState.pagination).toEqual(payload.pagination);
  });

  it('should handle fetchInterviewHistory.rejected', () => {
    const nextState = interviewsReducer(initialState, {
      type: fetchInterviewHistory.rejected.type,
      payload: 'Network Error'
    });
    
    expect(nextState.isLoading).toBe(false);
    expect(nextState.error).toBe('Network Error');
  });
});
