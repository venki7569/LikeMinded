import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import ConnectionRequestCard from './ConnectionRequestCard';

const connectionsApiMock = vi.hoisted(() => ({
  getStatus: vi.fn(),
  sendRequest: vi.fn(),
  acceptRequest: vi.fn(),
  rejectRequest: vi.fn(),
  cancelRequest: vi.fn(),
  removeConnection: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

vi.mock('@/features/connections/connectionsApi', () => ({
  default: connectionsApiMock,
  connectionsApi: connectionsApiMock,
}));

const request = {
  id: '665f1c4e8b1f4c0012a3b789',
  mutualConnectionCount: 2,
  user: {
    id: '665f1c4e8b1f4c0012a3b456',
    displayName: 'Grace Hopper',
    username: 'grace',
    occupation: 'Computer scientist',
    profileImage: { url: '' },
  },
};

describe('ConnectionRequestCard', () => {
  beforeEach(() => {
    Object.values(connectionsApiMock).forEach((fn) => fn.mockReset());
  });

  it('accepts an incoming request', async () => {
    connectionsApiMock.acceptRequest.mockResolvedValue({
      data: { data: { relationship: { status: 'connected', requestId: request.id } } },
    });

    renderWithProviders(<ConnectionRequestCard request={request} direction="incoming" />);

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('2 mutual connections')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(connectionsApiMock.acceptRequest).toHaveBeenCalledWith(request.id)
    );
  });

  it('cancels an outgoing request', async () => {
    connectionsApiMock.cancelRequest.mockResolvedValue({
      data: { data: { relationship: { status: 'none', requestId: null } } },
    });

    renderWithProviders(<ConnectionRequestCard request={request} direction="outgoing" />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(connectionsApiMock.cancelRequest).toHaveBeenCalledWith(request.id)
    );
  });
});
