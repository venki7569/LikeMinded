import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import themeReducer from '@/features/theme/themeSlice';
import toastReducer from '@/features/ui/toastSlice';

export function createStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      toasts: toastReducer,
    },
    preloadedState,
    devTools: import.meta.env.MODE !== 'production',
  });
}

export const store = createStore();
export default store;
