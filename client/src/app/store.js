import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import themeReducer from '@/features/theme/themeSlice';
import toastReducer from '@/features/ui/toastSlice';
import profileReducer from '@/features/profile/profileSlice';
import connectionsReducer from '@/features/connections/connectionsSlice';

import communitiesReducer from '@/features/communities/communitiesSlice';
import postsReducer from '@/features/posts/postSlice';
import notificationsReducer from '@/features/notifications/notificationSlice';
import chatReducer from '@/features/chat/chatSlice';
import eventsReducer from '@/features/events/eventSlice';
import matchingReducer from '@/features/matching/matchingSlice';

export function createStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      toasts: toastReducer,
      profile: profileReducer,
      connections: connectionsReducer,
      communities: communitiesReducer,
      posts: postsReducer,
      notifications: notificationsReducer,
      chat: chatReducer,
      events: eventsReducer,
      matching: matchingReducer,
    },
    preloadedState,
    devTools: import.meta.env.MODE !== 'production',
  });
}

export const store = createStore();
export default store;
