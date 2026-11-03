import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import matchingApi from './matchingApi';

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

export const fetchRecommendations = createAsyncThunk(
  'matching/fetchRecommendations',
  unwrap((params) => matchingApi.getRecommendations(params))
);

export const fetchMatchExplanation = createAsyncThunk(
  'matching/fetchExplanation',
  unwrap((userId) => matchingApi.explainMatch(userId))
);

const initialState = {
  recommendations: [],
  explanations: {},
  status: 'idle',
  error: null,
};

const matchingSlice = createSlice({
  name: 'matching',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.recommendations = action.payload.recommendations || [];
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(fetchMatchExplanation.fulfilled, (state, action) => {
        const userId = action.meta.arg;
        state.explanations[userId] = action.payload.explanation;
      });
  },
});

export const selectRecommendations = (state) => state.matching.recommendations;
export const selectMatchingStatus = (state) => state.matching.status;

export default matchingSlice.reducer;
