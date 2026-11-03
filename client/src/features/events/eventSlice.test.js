import { describe, expect, it } from 'vitest';
import eventReducer, { fetchEvents, toggleRsvp, deleteEvent } from './eventSlice';

describe('eventSlice', () => {
  it('starts with empty list', () => {
    const state = eventReducer(undefined, { type: '@@INIT' });
    expect(state.items).toEqual([]);
    expect(state.status).toBe('idle');
  });

  it('stores events on fetchEvents.fulfilled', () => {
    const events = [{ id: 'e1', title: 'Tech Talk' }];
    const state = eventReducer(
      undefined,
      fetchEvents.fulfilled({ events }, 'req', {})
    );
    expect(state.status).toBe('succeeded');
    expect(state.items).toEqual(events);
  });

  it('updates RSVP state on toggleRsvp.fulfilled', () => {
    const initial = {
      items: [{ id: 'e1', attendeeCount: 1, isRsvp: false }],
      pagination: null,
      status: 'succeeded',
      error: null,
      creationStatus: 'idle',
    };
    const state = eventReducer(
      initial,
      toggleRsvp.fulfilled({ isRsvp: true, attendeeCount: 2 }, 'req', 'e1')
    );
    expect(state.items[0].isRsvp).toBe(true);
    expect(state.items[0].attendeeCount).toBe(2);
  });

  it('removes event on deleteEvent.fulfilled', () => {
    const initial = {
      items: [{ id: 'e1' }, { id: 'e2' }],
      pagination: null,
      status: 'succeeded',
      error: null,
      creationStatus: 'idle',
    };
    const state = eventReducer(initial, deleteEvent.fulfilled({}, 'req', 'e1'));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('e2');
  });
});
