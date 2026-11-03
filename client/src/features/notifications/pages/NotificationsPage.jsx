import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import EmptyState from '@/components/molecules/EmptyState';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  selectNotifications,
  selectNotificationStatus,
  selectUnreadCount,
} from '../notificationSlice';

export function NotificationsPage() {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const status = useSelector(selectNotificationStatus);
  const unreadCount = useSelector(selectUnreadCount);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 50 }));
  }, [dispatch]);

  const filteredItems = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleMarkAsRead = (notification) => {
    const id = notification.id || notification._id;
    if (!notification.isRead) {
      dispatch(markNotificationAsRead(id));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Updates on connections, likes, comments, and community invites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch(markAllNotificationsAsRead())}
              leftIcon={<HiOutlineCheck className="h-4 w-4" />}
            >
              Mark all as read
            </Button>
          )}

          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </header>

      {status === 'loading' && notifications.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading notifications" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={HiOutlineBell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="We'll let you know when people connect with you or engage with your posts."
        />
      ) : (
        <div className="card-surface overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.map((item) => {
            const id = item.id || item._id;
            return (
              <div
                key={id}
                onClick={() => handleMarkAsRead(item)}
                className={`flex items-start gap-4 p-4 transition-colors cursor-pointer ${
                  item.isRead
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-850 opacity-80'
                    : 'bg-brand-50/40 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/40'
                }`}
              >
                <Avatar
                  name={item.actor?.name || 'Notification'}
                  src={item.actor?.avatar?.url}
                  size="md"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <time className="text-xs text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : ''}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                </div>
                {!item.isRead && (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600 flex-shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
