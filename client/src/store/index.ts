import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import classroomsReducer from '../features/classrooms/classroomsSlice';
import interviewsReducer from '../features/interviews/interviewsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    classrooms: classroomsReducer,
    interviews: interviewsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
