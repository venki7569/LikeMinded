import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import connectionsApi from './connectionsApi';

const initialState = {
  people: {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
    filters: { q: '', skill: '', interest: '', occupation: '', city: '', country: '' },
  },
  incoming: { items: [], meta: null, status: 'idle', error: null },
  outgoing: { items: [], meta: null, status: 'idle', error: null },
  connections: { items: [], meta: null, status: 'idle', error: null, q: '' },
  blocked: { items: [], meta: null, status: 'idle', error: null },
  relationshipById: {},
};

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

export const fetchPeople = createAsyncThunk(
  'connections/fetchPeople',
  unwrap((params) => connectionsApi.discoverPeople(params))
);

export const fetchIncoming = createAsyncThunk(
  'connections/fetchIncoming',
  unwrap((params) => connectionsApi.listIncoming(params))
);

export const fetchOutgoing = createAsyncThunk(
  'connections/fetchOutgoing',
  unwrap((params) => connectionsApi.listOutgoing(params))
);

export const fetchConnections = createAsyncThunk(
  'connections/fetchConnections',
  unwrap((params) => connectionsApi.listConnections(params))
);

export const fetchBlocked = createAsyncThunk(
  'connections/fetchBlocked',
  unwrap((params) => connectionsApi.listBlocked(params))
);

export const fetchRelationship = createAsyncThunk(
  'connections/fetchRelationship',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await connectionsApi.getStatus(userId);
      return { userId, relationship: response.data?.data?.relationship };
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

function applyList(state, key, itemsKey, action) {
  const payload = action.payload?.data ?? {};
  state[key].items = payload[itemsKey] ?? [];
  state[key].meta = action.payload?.meta ?? null;
  state[key].status = 'succeeded';
  state[key].error = null;
}

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    setPeopleFilters(state, action) {
      state.people.filters = { ...state.people.filters, ...action.payload };
    },
    setConnectionQuery(state, action) {
      state.connections.q = action.payload;
    },
    rememberRelationship(state, action) {
      const { userId, relationship } = action.payload;
      if (userId && relationship) state.relationshipById[userId] = relationship;
    },
  },
  extraReducers: (builder) => {
    const listPending = (key) => (state) => {
      state[key].status = 'loading';
      state[key].error = null;
    };
    const listFailed = (key) => (state, action) => {
      state[key].status = 'failed';
      state[key].error = action.payload?.message ?? 'Unable to load this list';
    };

    builder
      .addCase(fetchPeople.pending, listPending('people'))
      .addCase(fetchPeople.fulfilled, (state, action) => applyList(state, 'people', 'people', action))
      .addCase(fetchPeople.rejected, listFailed('people'))

      .addCase(fetchIncoming.pending, listPending('incoming'))
      .addCase(fetchIncoming.fulfilled, (state, action) =>
        applyList(state, 'incoming', 'requests', action)
      )
      .addCase(fetchIncoming.rejected, listFailed('incoming'))

      .addCase(fetchOutgoing.pending, listPending('outgoing'))
      .addCase(fetchOutgoing.fulfilled, (state, action) =>
        applyList(state, 'outgoing', 'requests', action)
      )
      .addCase(fetchOutgoing.rejected, listFailed('outgoing'))

      .addCase(fetchConnections.pending, listPending('connections'))
      .addCase(fetchConnections.fulfilled, (state, action) =>
        applyList(state, 'connections', 'connections', action)
      )
      .addCase(fetchConnections.rejected, listFailed('connections'))

      .addCase(fetchBlocked.pending, listPending('blocked'))
      .addCase(fetchBlocked.fulfilled, (state, action) =>
        applyList(state, 'blocked', 'blocked', action)
      )
      .addCase(fetchBlocked.rejected, listFailed('blocked'))

      .addCase(fetchRelationship.fulfilled, (state, action) => {
        const { userId, relationship } = action.payload;
        if (userId && relationship) state.relationshipById[userId] = relationship;
      });
  },
});

export const { setPeopleFilters, setConnectionQuery, rememberRelationship } = connectionsSlice.actions;

export const selectPeople = (state) => state.connections.people;
export const selectIncoming = (state) => state.connections.incoming;
export const selectOutgoing = (state) => state.connections.outgoing;
export const selectConnections = (state) => state.connections.connections;
export const selectBlocked = (state) => state.connections.blocked;
export const selectRelationship = (userId) => (state) =>
  state.connections.relationshipById[userId] ?? null;

export default connectionsSlice.reducer;
