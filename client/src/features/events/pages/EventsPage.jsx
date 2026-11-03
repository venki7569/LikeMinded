import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  HiOutlineCalendarDays,
  HiOutlineMapPin,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import EmptyState from '@/components/molecules/EmptyState';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  selectEvents,
  selectEventsStatus,
  toggleRsvp,
} from '../eventSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'technology', label: 'Technology' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'meetup', label: 'Meetups' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'career', label: 'Career' },
  { id: 'webinar', label: 'Webinars' },
  { id: 'social', label: 'Social' },
];

export function EventsPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const events = useSelector(selectEvents);
  const status = useSelector(selectEventsStatus);

  const [category, setCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'technology',
    startsAt: '',
    location: 'Online',
    description: '',
    capacity: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchEvents({ category: category === 'all' ? undefined : category }));
  }, [category, dispatch]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt || !form.description.trim()) {
      dispatch(pushToast({ message: 'Please fill in all required fields', tone: 'error' }));
      return;
    }

    setCreating(true);
    try {
      await dispatch(
        createEvent({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        })
      ).unwrap();

      dispatch(pushToast({ message: 'Event scheduled successfully!', tone: 'success' }));
      setShowCreateModal(false);
      setForm({
        title: '',
        category: 'technology',
        startsAt: '',
        location: 'Online',
        description: '',
        capacity: '',
      });
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to create event', tone: 'error' }));
    } finally {
      setCreating(false);
    }
  };

  const handleRsvp = async (eventId) => {
    if (!currentUser) {
      dispatch(pushToast({ message: 'Please sign in to RSVP for events', tone: 'error' }));
      return;
    }
    try {
      await dispatch(toggleRsvp(eventId)).unwrap();
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to update RSVP', tone: 'error' }));
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await dispatch(deleteEvent(eventId)).unwrap();
      dispatch(pushToast({ message: 'Event deleted', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to delete event', tone: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Events</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Meetups, webinars, hackathons, and community gatherings.
          </p>
        </div>

        {currentUser && (
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<HiOutlinePlus className="h-5 w-5" />}
          >
            Host an Event
          </Button>
        )}
      </header>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              category === cat.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {status === 'loading' && events.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading events" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={HiOutlineCalendarDays}
          title="No upcoming events found"
          description="Be the first to organize a meetup or workshop in this category!"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const eventId = event.id || event._id;
            const hostId = event.host?.id || event.host?._id || event.host;
            const isHost = currentUser && (currentUser.id === hostId || currentUser._id === hostId);
            const attendees = event.attendees || [];
            const isAttending = currentUser && attendees.some((a) => (a.id || a._id || a) === (currentUser.id || currentUser._id));
            const startDate = new Date(event.startsAt);
            const month = startDate.toLocaleString('default', { month: 'short' });
            const day = startDate.getDate();
            const time = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={eventId} className="card-surface overflow-hidden flex flex-col justify-between p-5 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/40 font-bold">
                        <span className="text-[10px] uppercase font-bold tracking-wider">{month}</span>
                        <span className="text-base font-extrabold leading-none -mt-1">{day}</span>
                      </div>
                      <div>
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300 mb-1">
                          {event.category}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          {event.title}
                        </h3>
                      </div>
                    </div>

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleDelete(eventId)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                        title="Delete event"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">
                    {event.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <HiOutlineCalendarDays className="h-4 w-4 text-brand-500" />
                      <span>{startDate.toLocaleDateString()} at {time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiOutlineMapPin className="h-4 w-4 text-emerald-500" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <HiOutlineUserGroup className="h-4 w-4" />
                    <span>{attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}</span>
                  </div>

                  <Button
                    size="xs"
                    variant={isAttending ? 'secondary' : 'primary'}
                    onClick={() => handleRsvp(eventId)}
                  >
                    {isHost ? 'Hosting' : isAttending ? 'Going ✓' : 'RSVP'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="card-surface max-w-lg w-full p-6 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold">Schedule an Event</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. React 19 Architecture Deep Dive"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="technology">Technology</option>
                    <option value="workshop">Workshop</option>
                    <option value="meetup">Meetup</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="career">Career</option>
                    <option value="webinar">Webinar</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Starts At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Location / Meeting URL</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Google Meet link or San Francisco, CA"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What will attendees learn or discuss?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Scheduling...' : 'Schedule Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsPage;
