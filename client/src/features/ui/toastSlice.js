import { createSlice, nanoid } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toasts',
  initialState: { items: [] },
  reducers: {
    pushToast: {
      reducer(state, action) {
        state.items.push(action.payload);
      },
      prepare({ message, tone = 'info', duration = 4500 }) {
        return { payload: { id: nanoid(), message, tone, duration } };
      },
    },
    dismissToast(state, action) {
      state.items = state.items.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.items = [];
    },
  },
});

export const { pushToast, dismissToast, clearToasts } = toastSlice.actions;
export const selectToasts = (state) => state.toasts.items;
export default toastSlice.reducer;
