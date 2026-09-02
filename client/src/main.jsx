import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import store from '@/app/store';
import router from '@/app/router';
import ToastHost from '@/components/organisms/ToastHost';
import { restoreSession, sessionExpired } from '@/features/auth/authSlice';
import { applyTheme, selectTheme } from '@/features/theme/themeSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { setSessionExpiredHandler } from '@/services/apiClient';
import '@/index.css';

// Paint the stored theme before React mounts to avoid a flash of the wrong one.
applyTheme(selectTheme(store.getState()));

// A failed token refresh must clear Redux, not just the axios layer.
setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
  store.dispatch(pushToast({ message: 'Your session expired. Please sign in again.', tone: 'warning' }));
});

// Recover an existing session from the httpOnly refresh cookie.
store.dispatch(restoreSession());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <ToastHost />
    </Provider>
  </StrictMode>
);
