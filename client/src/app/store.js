import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import themeReducer from '@/features/theme/themeSlice';
import toastReducer from '@/features/ui/toastSlice';
import profileReducer from '@/features/profile/profileSlice';
import connectionsReducer from '@/features/connections/connectionsSlice';

export function createStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      toasts: toastReducer,
      profile: profileReducer,
      connections: connectionsReducer,
    },
    preloadedState,
    devTools: import.meta.env.MODE !== 'production',
  });
}

export const store = createStore();
export default store;
