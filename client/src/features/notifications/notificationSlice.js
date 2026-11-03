import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import notificationApi from './notificationApi';

function unwrap(request) {
  return async (arg, { rejectWithValue }) => {
    try {
      const response = await request(arg);
      return response.data ?? {};
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  };
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  unwrap((params) => notificationApi.list(params))
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/unreadCount',
  unwrap(() => notificationApi.getUnreadCount())
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markRead',
  unwrap((id) => notificationApi.markRead(id))
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllRead',
  unwrap(() => notificationApi.markAllRead())
);

const initialState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.notifications || [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount ?? 0;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const updated = action.payload.notification;
        if (updated) {
          const item = state.items.find((n) => (n.id || n._id) === (updated.id || updated._id));
          if (item && !item.isRead) {
            item.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.items.forEach((n) => {
          n.isRead = true;
        });
        state.unreadCount = 0;
      });
  },
});

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationStatus = (state) => state.notifications.status;

export default notificationSlice.reducer;
