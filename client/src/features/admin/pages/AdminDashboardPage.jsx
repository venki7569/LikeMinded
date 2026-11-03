import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  HiOutlineShieldCheck,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
  HiOutlineCheck,
  HiOutlineNoSymbol,
} from 'react-icons/hi2';
import adminApi from '../adminApi';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { ForbiddenPage } from '@/pages/ErrorPages';

export function AdminDashboardPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;

    setLoading(true);
    Promise.all([
      adminApi.getStats().then((res) => setStats(res.data?.data?.stats || null)),
      adminApi.getReports().then((res) => setReports(res.data?.data?.reports || [])),
      adminApi.getUsers().then((res) => setUsers(res.data?.data?.users || [])),
    ])
      .catch((err) => {
        dispatch(pushToast({ message: err?.message || 'Failed to load admin data', tone: 'error' }));
      })
      .finally(() => setLoading(false));
  }, [user, dispatch]);

  if (user?.role !== 'admin') {
    return <ForbiddenPage />;
  }

  const handleResolveReport = async (reportId, status) => {
    try {
      await adminApi.resolveReport(reportId, { status });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId || r._id === reportId ? { ...r, status } : r))
      );
      dispatch(pushToast({ message: `Report marked as ${status}`, tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to update report', tone: 'error' }));
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await adminApi.updateUserRole(targetUserId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId || u._id === targetUserId ? { ...u, role: newRole } : u))
      );
      dispatch(pushToast({ message: 'User role updated', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to change role', tone: 'error' }));
    }
  };

  const handleBanToggle = async (targetUserId, currentBanned) => {
    const isBanned = !currentBanned;
    try {
      await adminApi.updateUserBan(targetUserId, isBanned);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId || u._id === targetUserId ? { ...u, isBanned } : u
        )
      );
      dispatch(
        pushToast({
          message: isBanned ? 'User banned from platform' : 'User unbanned',
          tone: isBanned ? 'warning' : 'success',
        })
      );
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to update user ban', tone: 'error' }));
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <HiOutlineShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Portal</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Platform analytics, content moderation, and user management.
            </p>
          </div>
        </div>
      </header>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card-surface p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <HiOutlineUsers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Users</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalUsers}</p>
            </div>
          </div>

          <div className="card-surface p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Posts</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalPosts}</p>
            </div>
          </div>

          <div className="card-surface p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <HiOutlineUserGroup className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Communities</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalCommunities}</p>
            </div>
          </div>

          <div className="card-surface p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <HiOutlineCalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Events</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalEvents}</p>
            </div>
          </div>

          <div className="card-surface p-4 flex items-center gap-3 border-amber-200 dark:border-amber-900/50">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Pending Reports</p>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.pendingReports}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card-surface p-6 shadow-sm space-y-4">
        <div className="flex gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'reports'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Moderation Reports ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            User Management ({users.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label="Loading admin panel" />
          </div>
        ) : activeTab === 'reports' ? (
          <div>
            {reports.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No moderation reports pending.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-400 uppercase tracking-wider dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Reporter</th>
                      <th className="py-2.5 px-3">Target</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reports.map((rep) => {
                      const repId = rep.id || rep._id;
                      return (
                        <tr key={repId} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {rep.reporter?.name || 'Anonymous'}
                            </span>
                            <span className="text-slate-400 block text-[10px]">@{rep.reporter?.username}</span>
                          </td>
                          <td className="py-3 px-3 capitalize font-medium">{rep.targetType}</td>
                          <td className="py-3 px-3">
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              {rep.reason}
                            </span>
                            {rep.description && <p className="text-slate-400 mt-1 line-clamp-1">{rep.description}</p>}
                          </td>
                          <td className="py-3 px-3 capitalize">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                rep.status === 'resolved'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : rep.status === 'dismissed'
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {rep.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {rep.status === 'pending' ? (
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="xs"
                                  onClick={() => handleResolveReport(repId, 'resolved')}
                                  leftIcon={<HiOutlineCheck className="h-3.5 w-3.5" />}
                                >
                                  Resolve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleResolveReport(repId, 'dismissed')}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Closed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter users by name, username, or email..."
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 uppercase tracking-wider dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ban Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => {
                    const uid = u.id || u._id;
                    const isSelf = uid === (user.id || user._id);

                    return (
                      <tr key={uid} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-3 px-3 flex items-center gap-2.5">
                          <Avatar name={u.name} src={u.avatar?.url} size="xs" />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</span>
                            <span className="text-slate-400 block text-[10px]">@{u.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role || 'user'}
                            disabled={isSelf}
                            onChange={(e) => handleRoleChange(uid, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 font-semibold"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          {u.isBanned ? (
                            <span className="rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                              Banned
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {!isSelf && (
                            <Button
                              variant={u.isBanned ? 'primary' : 'danger'}
                              size="xs"
                              onClick={() => handleBanToggle(uid, u.isBanned)}
                              leftIcon={u.isBanned ? <HiOutlineCheck className="h-3.5 w-3.5" /> : <HiOutlineNoSymbol className="h-3.5 w-3.5" />}
                            >
                              {u.isBanned ? 'Unban' : 'Ban'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
