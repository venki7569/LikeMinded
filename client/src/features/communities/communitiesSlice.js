import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import communitiesApi from './communitiesApi';

const initialState = {
  list: {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
    filters: { q: '', category: '', interest: '', sort: 'newest' },
  },
  current: { community: null, status: 'idle', error: null },
  members: { items: [], meta: null, status: 'idle', error: null },
  joinRequests: { items: [], meta: null, status: 'idle', error: null },
  invitations: { items: [], meta: null, status: 'idle', error: null },
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

export const fetchCommunities = createAsyncThunk(
  'communities/list',
  unwrap((params) => communitiesApi.list(params))
);

export const fetchCommunity = createAsyncThunk(
  'communities/get',
  unwrap((slug) => communitiesApi.getBySlug(slug))
);

export const createCommunity = createAsyncThunk(
  'communities/create',
  unwrap((payload) => communitiesApi.create(payload))
);

export const fetchMembers = createAsyncThunk(
  'communities/members',
  unwrap(({ slug, ...params }) => communitiesApi.listMembers(slug, params))
);

export const fetchJoinRequests = createAsyncThunk(
  'communities/joinRequests',
  unwrap(({ slug, ...params }) => communitiesApi.listJoinRequests(slug, params))
);

export const fetchInvitations = createAsyncThunk(
  'communities/invitations',
  unwrap((params) => communitiesApi.listMyInvitations(params))
);

const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
    setCommunityFilters(state, action) {
      state.list.filters = { ...state.list.filters, ...action.payload };
    },
    clearCurrentCommunity(state) {
      state.current = { community: null, status: 'idle', error: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunities.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchCommunities.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.items = action.payload.data?.communities ?? [];
        state.list.meta = action.payload.meta ?? null;
      })
      .addCase(fetchCommunities.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload?.message ?? 'Unable to load communities';
      })

      .addCase(fetchCommunity.pending, (state) => {
        state.current.status = 'loading';
        state.current.error = null;
      })
      .addCase(fetchCommunity.fulfilled, (state, action) => {
        state.current.status = 'succeeded';
        state.current.community = action.payload.data?.community ?? null;
      })
      .addCase(fetchCommunity.rejected, (state, action) => {
        state.current.status = 'failed';
        state.current.error = action.payload?.message ?? 'Unable to load this community';
      })

      .addCase(createCommunity.fulfilled, (state, action) => {
        const community = action.payload.data?.community;
        if (community) state.current.community = community;
      })

      .addCase(fetchMembers.pending, (state) => {
        state.members.status = 'loading';
        state.members.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.members.status = 'succeeded';
        state.members.items = action.payload.data?.members ?? [];
        state.members.meta = action.payload.meta ?? null;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.members.status = 'failed';
        state.members.error = action.payload?.message ?? 'Unable to load members';
      })

      .addCase(fetchJoinRequests.pending, (state) => {
        state.joinRequests.status = 'loading';
        state.joinRequests.error = null;
      })
      .addCase(fetchJoinRequests.fulfilled, (state, action) => {
        state.joinRequests.status = 'succeeded';
        state.joinRequests.items = action.payload.data?.requests ?? [];
        state.joinRequests.meta = action.payload.meta ?? null;
      })
      .addCase(fetchJoinRequests.rejected, (state, action) => {
        state.joinRequests.status = 'failed';
        state.joinRequests.error = action.payload?.message ?? 'Unable to load requests';
      })

      .addCase(fetchInvitations.pending, (state) => {
        state.invitations.status = 'loading';
        state.invitations.error = null;
      })
      .addCase(fetchInvitations.fulfilled, (state, action) => {
        state.invitations.status = 'succeeded';
        state.invitations.items = action.payload.data?.invitations ?? [];
        state.invitations.meta = action.payload.meta ?? null;
      })
      .addCase(fetchInvitations.rejected, (state, action) => {
        state.invitations.status = 'failed';
        state.invitations.error = action.payload?.message ?? 'Unable to load invitations';
      });
  },
});

export const { setCommunityFilters, clearCurrentCommunity } = communitiesSlice.actions;
export const selectCommunityList = (state) => state.communities.list;
export const selectCurrentCommunity = (state) => state.communities.current;
export const selectCommunityMembers = (state) => state.communities.members;
export const selectJoinRequests = (state) => state.communities.joinRequests;
export const selectInvitations = (state) => state.communities.invitations;
export default communitiesSlice.reducer;
