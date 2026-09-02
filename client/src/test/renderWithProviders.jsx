import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore } from '@/app/store';

/**
 * Renders a component inside the Redux and Router providers the app supplies,
 * returning the store so tests can assert on dispatched state.
 */
export function renderWithProviders(
  ui,
  { preloadedState, store = createStore(preloadedState), route = '/', ...options } = {}
) {
  const wrapper = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper, ...options }) };
}

export default renderWithProviders;
