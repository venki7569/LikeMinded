import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL,
  // Required so the httpOnly refresh cookie travels with /auth requests.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * The access token is kept in memory only. Persisting it to localStorage would
 * expose it to any XSS payload; a page reload recovers the session from the
 * httpOnly refresh cookie instead.
 */
let accessToken = null;
let onSessionExpired = () => {};

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Endpoints that must never trigger a refresh-and-retry cycle.
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

let refreshPromise = null;

/** Collapses parallel 401s into a single refresh request. */
async function refreshAccessToken() {
  refreshPromise ??= apiClient
    .post('/auth/refresh')
    .then((response) => {
      const token = response.data?.data?.accessToken ?? null;
      setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const shouldAttemptRefresh =
      response?.status === 401 &&
      config &&
      !config.__isRetry &&
      !NO_RETRY_PATHS.some((path) => config.url?.includes(path));

    if (shouldAttemptRefresh) {
      try {
        const token = await refreshAccessToken();
        if (token) {
          config.__isRetry = true;
          config.headers.Authorization = `Bearer ${token}`;
          return apiClient(config);
        }
      } catch {
        // Fall through to the rejection below.
      }
      setAccessToken(null);
      onSessionExpired();
    }

    return Promise.reject(error);
  }
);

/** Normalizes an axios failure into a message plus per-field errors. */
export function toApiError(error) {
  const payload = error?.response?.data;
  return {
    message: payload?.message ?? error?.message ?? 'Something went wrong',
    status: error?.response?.status ?? 0,
    fieldErrors: (payload?.errors ?? []).reduce((accumulator, issue) => {
      // Server paths look like `body.email`; forms only know `email`.
      const field = String(issue.field ?? '').split('.').pop();
      if (field && !accumulator[field]) accumulator[field] = issue.message;
      return accumulator;
    }, {}),
  };
}

export default apiClient;
