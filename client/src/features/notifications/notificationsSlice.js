import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as notificationService from "../../services/notificationService";

// Helper to convert async errors to readable messages
const toErrorMessage = (error, fallback) =>
  error?.message || fallback || "An unexpected error occurred.";

/**
 * Fetch paginated list of notifications
 */
export const getNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (params, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      const response = await notificationService.fetchNotifications(token, params);
      return response; // Contains data (notifications array) and pagination
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to load notifications"));
    }
  }
);

/**
 * Fetch unread notifications count
 */
export const getUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      const response = await notificationService.fetchUnreadCount(token);
      return response.data; // Contains { unreadCount: number }
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to load unread count"));
    }
  }
);

/**
 * Mark a single notification as read (with Optimistic UI updates)
 */
export const markAsRead = createAsyncThunk(
  "notifications/markRead",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      const response = await notificationService.markNotificationRead(id, token);
      return response.data; // Contains updated notification
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to mark notification as read"));
    }
  }
);

/**
 * Mark all user notifications as read (with Optimistic UI updates)
 */
export const markAllAsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      await notificationService.markAllNotificationsRead(token);
      return null;
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to mark all as read"));
    }
  }
);

/**
 * Delete a single notification (with Optimistic UI updates)
 */
export const deleteNotificationById = createAsyncThunk(
  "notifications/delete",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      await notificationService.deleteNotification(id, token);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to delete notification"));
    }
  }
);

/**
 * Delete all notifications (with Optimistic UI updates)
 */
export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAll",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;
      if (!token) return thunkAPI.rejectWithValue("No auth token available");

      await notificationService.deleteAllNotifications(token);
      return null;
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Failed to clear notifications"));
    }
  }
);

const initialState = {
  items: [],
  unreadCount: 0,
  loading: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  },
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Socket listener trigger to insert a new live notification
    addLiveNotification: (state, action) => {
      const notif = action.payload;
      const exists = state.items.some((item) => item._id === notif._id);
      
      if (!exists) {
        state.items.unshift(notif);
        if (!notif.isRead) {
          state.unreadCount += 1;
        }
        state.pagination.total += 1;
      }
    },
    // Reset notification state on user logout
    resetNotifications: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications list
      .addCase(getNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.loading = false;
        
        // If it's page 1, replace. If it's subsequent page, append (infinite scroll logic)
        const { data: notifications = [], pagination } = action.payload;
        if (pagination.page === 1) {
          state.items = notifications;
        } else {
          // Merge avoiding duplicates
          const newItems = notifications.filter(
            (item) => !state.items.some((existing) => existing._id === item._id)
          );
          state.items = [...state.items, ...newItems];
        }
        
        state.pagination = pagination;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch unread count
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
      })

      // Mark single notification as read (Optimistic Update)
      .addCase(markAsRead.pending, (state, action) => {
        const id = action.meta.arg;
        const index = state.items.findIndex((item) => item._id === id);
        if (index !== -1 && !state.items[index].isRead) {
          state.items[index].isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        const id = action.meta.arg;
        const index = state.items.findIndex((item) => item._id === id);
        if (index !== -1 && state.items[index].isRead) {
          state.items[index].isRead = false;
          state.unreadCount += 1;
        }
        state.error = action.payload;
      })

      // Mark all notifications as read (Optimistic Update)
      .addCase(markAllAsRead.pending, (state) => {
        state._rollbackUnreadIds = state.items
          .filter((item) => !item.isRead)
          .map((item) => item._id);
        state.items = state.items.map((item) => ({ ...item, isRead: true }));
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        const unreadIds = state._rollbackUnreadIds;
        if (unreadIds && unreadIds.length > 0) {
          state.items.forEach((item) => {
            if (unreadIds.includes(item._id)) {
              item.isRead = false;
            }
          });
          state.unreadCount = unreadIds.length;
          state._rollbackUnreadIds = null;
        }
        state.error = action.payload;
      })

      // Delete a single notification (Optimistic Update)
      .addCase(deleteNotificationById.pending, (state, action) => {
          const id = action.meta.arg;
          const itemToDelete = state.items.find((item) => item._id === id);
          
          if (itemToDelete) {
            state._rollbackDeletedItem = itemToDelete;
            if (!itemToDelete.isRead) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.items = state.items.filter((item) => item._id !== id);
            state.pagination.total = Math.max(0, state.pagination.total - 1);
          }
        })
      .addCase(deleteNotificationById.rejected, (state, action) => {
          const deleted = state._rollbackDeletedItem;
          if (deleted) {
            state.items.push(deleted);
            if (!deleted.isRead) {
              state.unreadCount += 1;
            }
            state.pagination.total += 1;
            state._rollbackDeletedItem = null;
          }
          state.error = action.payload;
        })

      // Clear all notifications (Optimistic Update)
      .addCase(clearAllNotifications.pending, (state) => {
          state._rollbackSnapshot = {
            items: state.items,
            unreadCount: state.unreadCount,
            pagination: state.pagination,
          };
          state.items = [];
          state.unreadCount = 0;
          state.pagination = initialState.pagination;
        })
      .addCase(clearAllNotifications.rejected, (state, action) => {
          const snapshot = state._rollbackSnapshot;
          if (snapshot) {
            state.items = snapshot.items;
            state.unreadCount = snapshot.unreadCount;
            state.pagination = snapshot.pagination;
            state._rollbackSnapshot = null;
          }
          state.error = action.payload;
        });
  },
});

export const { addLiveNotification, resetNotifications } = notificationsSlice.actions;

export default notificationsSlice.reducer;
