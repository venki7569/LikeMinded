import { describe, expect, it } from 'vitest';
import notificationReducer, {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notificationSlice';

describe('notificationSlice', () => {
  it('starts with empty list and zero unread count', () => {
    const state = notificationReducer(undefined, { type: '@@INIT' });
    expect(state.items).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.status).toBe('idle');
  });

  it('stores notifications on fetchNotifications.fulfilled', () => {
    const notifications = [{ id: 'n1', title: 'New Like', isRead: false }];
    const state = notificationReducer(
      undefined,
      fetchNotifications.fulfilled({ notifications }, 'req', {})
    );
    expect(state.status).toBe('succeeded');
    expect(state.items).toEqual(notifications);
  });

  it('sets unread count on fetchUnreadCount.fulfilled', () => {
    const state = notificationReducer(
      undefined,
      fetchUnreadCount.fulfilled({ unreadCount: 5 }, 'req')
    );
    expect(state.unreadCount).toBe(5);
  });

  it('marks single notification read and decrements count', () => {
    const initial = {
      items: [{ id: 'n1', isRead: false }, { id: 'n2', isRead: true }],
      unreadCount: 1,
      status: 'succeeded',
      error: null,
    };
    const state = notificationReducer(
      initial,
      markNotificationAsRead.fulfilled({ notification: { id: 'n1', isRead: true } }, 'req', 'n1')
    );
    expect(state.items[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('marks all notifications read on markAllNotificationsAsRead.fulfilled', () => {
    const initial = {
      items: [{ id: 'n1', isRead: false }, { id: 'n2', isRead: false }],
      unreadCount: 2,
      status: 'succeeded',
      error: null,
    };
    const state = notificationReducer(
      initial,
      markAllNotificationsAsRead.fulfilled({}, 'req')
    );
    expect(state.items.every((n) => n.isRead)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });
});
