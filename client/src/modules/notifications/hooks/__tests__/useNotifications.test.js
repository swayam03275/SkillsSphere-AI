import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import * as reactRedux from 'react-redux';
import * as notificationsSlice from '../../../../features/notifications/notificationsSlice';

// Mock react-redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: vi.fn(),
}));

// Mock notifications slice actions
vi.mock('../../../../features/notifications/notificationsSlice', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotificationById: vi.fn(),
  clearAllNotifications: vi.fn(),
  deleteNotificationsBulk: vi.fn(),
}));

describe('useNotifications Hook', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    reactRedux.useDispatch.mockReturnValue(mockDispatch);
  });

  it('should fetch notifications and unread count on mount', () => {
    reactRedux.useSelector.mockReturnValue({
      items: [],
      unreadCount: 0,
      loading: false,
      error: null,
      pagination: { page: 1, pages: 1 },
      socketStatus: 'connected'
    });

    renderHook(() => useNotifications({ page: 1, limit: 10, filter: 'all' }));

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(notificationsSlice.getNotifications).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      isRead: undefined,
      type: undefined
    });
    expect(notificationsSlice.getUnreadCount).toHaveBeenCalled();
  });

  it('should return mapped state from redux store', () => {
    const mockState = {
      items: [{ id: 1, text: 'Hello' }],
      unreadCount: 5,
      loading: false,
      error: null,
      pagination: { page: 1, pages: 3 },
      socketStatus: 'connected'
    };
    
    reactRedux.useSelector.mockReturnValue(mockState);

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual(mockState.items);
    expect(result.current.unreadCount).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it('should dispatch markAsRead', () => {
    reactRedux.useSelector.mockReturnValue({ pagination: { page: 1, pages: 1 } });
    const { result } = renderHook(() => useNotifications());

    result.current.markAsRead('notif-1');
    expect(mockDispatch).toHaveBeenCalledWith(notificationsSlice.markAsRead('notif-1'));
  });

  it('should handle loadMore correctly', () => {
    reactRedux.useSelector.mockReturnValue({ pagination: { page: 1, pages: 2 } });
    const { result } = renderHook(() => useNotifications({ limit: 10 }));

    // Reset mount calls
    mockDispatch.mockClear();

    result.current.loadMore();
    
    expect(mockDispatch).toHaveBeenCalledWith(
      notificationsSlice.getNotifications({ page: 2, limit: 10, isRead: undefined, type: undefined })
    );
  });
});
