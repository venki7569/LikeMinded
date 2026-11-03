import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Spinner from '@/components/atoms/Spinner';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  selectNotifications,
  selectUnreadCount,
} from '../notificationSlice';

export function NotificationsPopover() {
  const dispatch = useDispatch();
  const unreadCount = useSelector(selectUnreadCount);
  const notifications = useSelector(selectNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen) {
      setLoading(true);
      dispatch(fetchNotifications({ limit: 10 })).finally(() => setLoading(false));
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (notification) => {
    const id = notification.id || notification._id;
    if (!notification.isRead) {
      dispatch(markNotificationAsRead(id));
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        <HiOutlineBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400 font-medium"
              >
                <HiOutlineCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner size="sm" label="Loading notifications" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((item) => {
                const id = item.id || item._id;
                return (
                  <div
                    key={id}
                    onClick={() => handleMarkAsRead(item)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      item.isRead
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-850 opacity-80'
                        : 'bg-brand-50/50 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/40'
                    }`}
                  >
                    <Avatar
                      name={item.actor?.name || 'LikeMinded'}
                      src={item.actor?.avatar?.url}
                      size="sm"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{item.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 inline-block">
                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-brand-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPopover;
