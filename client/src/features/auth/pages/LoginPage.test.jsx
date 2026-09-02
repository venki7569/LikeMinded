import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import LoginPage from './LoginPage';

const authApiMock = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('@/features/auth/authApi', () => ({
  default: authApiMock,
  authApi: authApiMock,
}));

const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'user' };

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to likeminded/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('blocks submission and shows messages when fields are empty', async () => {
    renderWithProviders(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Enter your email or username')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(authApiMock.login).not.toHaveBeenCalled();
  });

  it('submits the credentials and stores the session', async () => {
    authApiMock.login.mockResolvedValue({ data: { data: { user, accessToken: 'token' } } });
    const { store } = renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email or username/i), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Passw0rd123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApiMock.login).toHaveBeenCalledWith({
        identifier: 'ada@example.com',
        password: 'Passw0rd123',
      });
    });

    await waitFor(() => expect(store.getState().auth.isAuthenticated).toBe(true));
    expect(store.getState().auth.user).toEqual(user);
  });

  it('surfaces the server message when credentials are wrong', async () => {
    authApiMock.login.mockRejectedValue({
      response: { status: 401, data: { message: 'Incorrect email/username or password' } },
    });
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email or username/i), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Wrongpass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText('Incorrect email/username or password')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('links to registration and password recovery', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });
});
