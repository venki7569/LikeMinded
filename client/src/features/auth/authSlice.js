import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { setAccessToken, toApiError } from '@/services/apiClient';
import authApi from './authApi';

const initialState = {
  user: null,
  isAuthenticated: false,
  // `true` until the first refresh attempt settles, so guards can wait instead
  // of bouncing a signed-in user to /login on a page reload.
  isInitializing: true,
  isSubmitting: false,
  error: null,
  fieldErrors: {},
};

/** Wraps a request so thunks always reject with our normalized error shape. */
function withApiError(request) {
  return async (arg, { rejectWithValue }) => {
    try {
      const response = await request(arg);
      return response.data?.data ?? {};
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  };
}

export const registerUser = createAsyncThunk(
  'auth/register',
  withApiError((payload) => authApi.register(payload))
);

export const loginUser = createAsyncThunk(
  'auth/login',
  withApiError((payload) => authApi.login(payload))
);

/** Restores a session from the httpOnly refresh cookie on app start. */
export const restoreSession = createAsyncThunk('auth/restore', async (_arg, { rejectWithValue }) => {
  try {
    const response = await authApi.refresh();
    return response.data?.data ?? {};
  } catch (error) {
    // No cookie simply means "not signed in", which is not an error state.
    return rejectWithValue(toApiError(error));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    setAccessToken(null);
  }
});

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  withApiError((token) => authApi.verifyEmail(token))
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  withApiError((email) => authApi.forgotPassword(email))
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  withApiError((payload) => authApi.resetPassword(payload))
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
      state.fieldErrors = {};
    },
    sessionExpired(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
    },
  },
  extraReducers: (builder) => {
    const authenticate = (state, action) => {
      state.isSubmitting = false;
      state.user = action.payload.user ?? null;
      state.isAuthenticated = Boolean(action.payload.user);
      state.isInitializing = false;
      state.error = null;
      state.fieldErrors = {};
      setAccessToken(action.payload.accessToken);
    };

    const startSubmit = (state) => {
      state.isSubmitting = true;
      state.error = null;
      state.fieldErrors = {};
    };

    const failSubmit = (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload?.message ?? 'Something went wrong';
      state.fieldErrors = action.payload?.fieldErrors ?? {};
    };

    builder
      .addCase(registerUser.pending, startSubmit)
      .addCase(registerUser.fulfilled, authenticate)
      .addCase(registerUser.rejected, failSubmit)

      .addCase(loginUser.pending, startSubmit)
      .addCase(loginUser.fulfilled, authenticate)
      .addCase(loginUser.rejected, failSubmit)

      .addCase(restoreSession.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(restoreSession.fulfilled, authenticate)
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isInitializing = false;
        setAccessToken(null);
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })

      .addCase(verifyEmail.pending, startSubmit)
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isSubmitting = false;
        // Only patch the cached user when it is the same account.
        if (state.user && action.payload.user?.id === state.user.id) {
          state.user = action.payload.user;
        }
      })
      .addCase(verifyEmail.rejected, failSubmit)

      .addCase(forgotPassword.pending, startSubmit)
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(forgotPassword.rejected, failSubmit)

      .addCase(resetPassword.pending, startSubmit)
      .addCase(resetPassword.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(resetPassword.rejected, failSubmit);
  },
});

export const { clearAuthError, sessionExpired, setUser } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;
