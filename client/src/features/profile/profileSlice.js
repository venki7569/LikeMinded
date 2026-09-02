import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import profileApi from './profileApi';

const initialState = {
  viewed: null,
  completeness: null,
  status: 'idle',
  error: null,
};

function unwrap(request) {
  return async (arg, { rejectWithValue }) => {
    try {
      const response = await request(arg);
      return response.data?.data ?? {};
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  };
}

export const fetchOwnProfile = createAsyncThunk(
  'profile/fetchOwn',
  unwrap(() => profileApi.getMe())
);

export const fetchProfileByUsername = createAsyncThunk(
  'profile/fetchByUsername',
  unwrap((username) => profileApi.getByUsername(username))
);

export const saveOwnProfile = createAsyncThunk(
  'profile/saveOwn',
  unwrap((payload) => profileApi.updateMe(payload))
);

export const fetchCompleteness = createAsyncThunk(
  'profile/fetchCompleteness',
  unwrap(() => profileApi.getCompleteness())
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearViewedProfile(state) {
      state.viewed = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    const failed = (state, action) => {
      state.status = 'failed';
      state.error = action.payload?.message ?? 'Unable to load this profile';
    };

    builder
      .addCase(fetchOwnProfile.pending, pending)
      .addCase(fetchOwnProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.viewed = action.payload.profile;
        state.completeness = action.payload.profile?.completeness ?? state.completeness;
      })
      .addCase(fetchOwnProfile.rejected, failed)

      .addCase(fetchProfileByUsername.pending, pending)
      .addCase(fetchProfileByUsername.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.viewed = action.payload.profile;
      })
      .addCase(fetchProfileByUsername.rejected, failed)

      .addCase(saveOwnProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.viewed = action.payload.profile;
        state.completeness = action.payload.profile?.completeness ?? state.completeness;
      })
      .addCase(saveOwnProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? 'Unable to save profile';
      })

      .addCase(fetchCompleteness.fulfilled, (state, action) => {
        state.completeness = action.payload.completeness;
      });
  },
});

export const { clearViewedProfile } = profileSlice.actions;
export const selectViewedProfile = (state) => state.profile.viewed;
export const selectProfileStatus = (state) => state.profile.status;
export const selectProfileError = (state) => state.profile.error;
export const selectCompleteness = (state) => state.profile.completeness;
export default profileSlice.reducer;
