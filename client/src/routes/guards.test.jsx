import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

const signedIn = {
  auth: {
    user: { id: 'u1', name: 'Ada', role: 'user' },
    isAuthenticated: true,
    isInitializing: false,
    isSubmitting: false,
    error: null,
    fieldErrors: {},
  },
};

const signedOut = { ...signedIn, auth: { ...signedIn.auth, user: null, isAuthenticated: false } };

const admin = {
  ...signedIn,
  auth: { ...signedIn.auth, user: { id: 'u2', name: 'Root', role: 'admin' } },
};

function renderGuard(preloadedState, { roles } = {}) {
  return renderWithProviders(
    <Routes>
      <Route element={<ProtectedRoute roles={roles} />}>
        <Route path="/" element={<p>Private area</p>} />
      </Route>
      <Route path="/login" element={<p>Login screen</p>} />
      <Route path="/403" element={<p>Forbidden screen</p>} />
    </Routes>,
    { preloadedState }
  );
}

describe('ProtectedRoute', () => {
  it('renders the private route for a signed-in user', () => {
    renderGuard(signedIn);
    expect(screen.getByText('Private area')).toBeInTheDocument();
  });

  it('redirects an anonymous visitor to login', () => {
    renderGuard(signedOut);
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('waits instead of redirecting while the session is being restored', () => {
    renderGuard({ auth: { ...signedOut.auth, isInitializing: true } });

    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /restoring your session/i })).toBeInTheDocument();
  });

  it('sends a user without the required role to 403', () => {
    renderGuard(signedIn, { roles: ['admin'] });
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument();
  });

  it('allows a user who holds the required role', () => {
    renderGuard(admin, { roles: ['admin'] });
    expect(screen.getByText('Private area')).toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  it('keeps a signed-in user away from auth screens', () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<p>Login screen</p>} />
        </Route>
        <Route path="/" element={<p>Feed</p>} />
      </Routes>,
      { preloadedState: signedIn, route: '/login' }
    );

    expect(screen.getByText('Feed')).toBeInTheDocument();
  });

  it('shows the auth screen to an anonymous visitor', () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<p>Login screen</p>} />
        </Route>
      </Routes>,
      { preloadedState: signedOut, route: '/login' }
    );

    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });
});
