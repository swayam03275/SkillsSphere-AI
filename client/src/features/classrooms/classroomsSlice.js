import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  createClassroomSession as apiCreateSession,
  getTutorClassroomSessions as apiGetTutorSessions,
  getActiveClassroomSessions as apiGetActiveSessions,
  endClassroomSession as apiEndSession,
  getClassroomSession as apiGetSession,
} from '../../modules/classrooms/services/classroomService';

export const fetchTutorSessions = createAsyncThunk(
  'classrooms/fetchTutorSessions',
  async (token, { rejectWithValue }) => {
    try {
      const res = await apiGetTutorSessions(token);
      if (!res.success) throw new Error(res.error || 'Failed to fetch sessions');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load your classroom sessions. Please try again.');
    }
  }
);

export const fetchActiveSessions = createAsyncThunk(
  'classrooms/fetchActiveSessions',
  async (token, { rejectWithValue }) => {
    try {
      const res = await apiGetActiveSessions(token);
      if (!res.success) throw new Error(res.error || 'Failed to fetch active sessions');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load active classrooms. Please try again.');
    }
  }
);

export const createSession = createAsyncThunk(
  'classrooms/createSession',
  async ({ sessionData, token }, { rejectWithValue }) => {
    try {
      const res = await apiCreateSession(sessionData, token);
      if (!res.success) throw new Error(res.error || 'Failed to create room');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create live classroom session.');
    }
  }
);

export const endSession = createAsyncThunk(
  'classrooms/endSession',
  async ({ roomId, token }, { rejectWithValue }) => {
    try {
      const res = await apiEndSession(roomId, token);
      if (!res.success) throw new Error(res.error || 'Failed to end session');
      return roomId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to end the session.');
    }
  }
);

export const getSession = createAsyncThunk(
  'classrooms/getSession',
  async ({ roomId, token }, { rejectWithValue }) => {
    try {
      const res = await apiGetSession(roomId, token);
      if (!res.success) throw new Error(res.error || 'Failed to get session');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get the session.');
    }
  }
);

const initialState = {
  sessions: [],
  currentSession: null,
  isListLoading: false,
  isLoading: false,
  error: null,
};

const classroomsSlice = createSlice({
  name: 'classrooms',
  initialState,
  reducers: {
    clearClassroomsError: (state) => {
      state.error = null;
    },
    clearCurrentSession: (state) => {
      state.currentSession = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tutor Sessions
      .addCase(fetchTutorSessions.pending, (state) => {
        state.isListLoading = true;
        state.error = null;
      })
      .addCase(fetchTutorSessions.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.sessions = action.payload || [];
      })
      .addCase(fetchTutorSessions.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.payload;
      })
      // Fetch Active Sessions
      .addCase(fetchActiveSessions.pending, (state) => {
        state.isListLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveSessions.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.sessions = action.payload || [];
      })
      .addCase(fetchActiveSessions.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.payload;
      })
      // Create Session
      .addCase(createSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.sessions.unshift(action.payload);
        }
      })
      .addCase(createSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // End Session
      .addCase(endSession.pending, (state) => {
        state.error = null;
      })
      .addCase(endSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(s => s.roomId !== action.payload && s._id !== action.payload);
      })
      .addCase(endSession.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Get Session
      .addCase(getSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSession = action.payload;
      })
      .addCase(getSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearClassroomsError, clearCurrentSession } = classroomsSlice.actions;
export default classroomsSlice.reducer;
