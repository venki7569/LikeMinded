import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import eventApi from './eventApi';

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

export const fetchEvents = createAsyncThunk(
  'events/fetchList',
  unwrap((params) => eventApi.list(params))
);

export const createEvent = createAsyncThunk(
  'events/create',
  unwrap((payload) => eventApi.create(payload))
);

export const toggleRsvp = createAsyncThunk(
  'events/toggleRsvp',
  unwrap((eventId) => eventApi.toggleRsvp(eventId))
);

export const deleteEvent = createAsyncThunk(
  'events/delete',
  unwrap((eventId) => eventApi.delete(eventId))
);

const initialState = {
  items: [],
  pagination: null,
  status: 'idle',
  error: null,
  creationStatus: 'idle',
};

const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.events || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        if (action.payload.event) {
          state.items.unshift(action.payload.event);
        }
      })
      .addCase(toggleRsvp.fulfilled, (state, action) => {
        const eventId = action.meta.arg;
        const event = state.items.find((e) => (e.id || e._id) === eventId);
        if (event) {
          event.attendeeCount = action.payload.attendeeCount;
          event.isRsvp = action.payload.isRsvp;
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        const eventId = action.meta.arg;
        state.items = state.items.filter((e) => (e.id || e._id) !== eventId);
      });
  },
});

export const selectEvents = (state) => state.events.items;
export const selectEventsStatus = (state) => state.events.status;

export default eventSlice.reducer;
