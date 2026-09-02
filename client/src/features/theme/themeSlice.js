import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'likeminded:theme';

function readInitialTheme() {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applied imperatively because Tailwind's dark variant keys off a class. */
function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: readInitialTheme() },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      applyTheme(state.mode);
    },
    setTheme(state, action) {
      state.mode = action.payload;
      applyTheme(state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const selectTheme = (state) => state.theme.mode;
export { applyTheme, readInitialTheme };
export default themeSlice.reducer;
