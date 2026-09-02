import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import ConnectionButton from './ConnectionButton';

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

const userId = '665f1c4e8b1f4c0012a3b456';
const requestId = '665f1c4e8b1f4c0012a3b789';

function relationship(status, extra = {}) {
  return { data: { data: { relationship: { status, requestId, ...extra } } } };
}

describe('ConnectionButton', () => {
  beforeEach(() => {
    Object.values(connectionsApiMock).forEach((fn) => fn.mockReset());
  });

  it('shows Connect for none and sends a request', async () => {
    connectionsApiMock.sendRequest.mockResolvedValue(relationship('outgoing_pending'));

    renderWithProviders(
      <ConnectionButton userId={userId} relationshipStatus="none" />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => expect(connectionsApiMock.sendRequest).toHaveBeenCalledWith(userId));
    expect(await screen.findByRole('button', { name: 'Request Sent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('accepts an incoming request', async () => {
    connectionsApiMock.acceptRequest.mockResolvedValue(relationship('connected'));

    renderWithProviders(
      <ConnectionButton
        userId={userId}
        requestId={requestId}
        relationshipStatus="incoming_pending"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(connectionsApiMock.acceptRequest).toHaveBeenCalledWith(requestId));
    expect(await screen.findByRole('button', { name: 'Connected' })).toBeDisabled();
  });

  it('rejects an incoming request', async () => {
    connectionsApiMock.rejectRequest.mockResolvedValue(relationship('none'));

    renderWithProviders(
      <ConnectionButton
        userId={userId}
        requestId={requestId}
        relationshipStatus="incoming_pending"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(connectionsApiMock.rejectRequest).toHaveBeenCalledWith(requestId));
    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('cancels an outgoing request', async () => {
    connectionsApiMock.cancelRequest.mockResolvedValue(relationship('none'));

    renderWithProviders(
      <ConnectionButton
        userId={userId}
        requestId={requestId}
        relationshipStatus="outgoing_pending"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(connectionsApiMock.cancelRequest).toHaveBeenCalledWith(requestId));
    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('shows a loading control while status is fetched', () => {
    connectionsApiMock.getStatus.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ConnectionButton userId={userId} />);

    expect(screen.getByRole('button', { name: /connect/i })).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error when sending a request fails', async () => {
    connectionsApiMock.sendRequest.mockRejectedValue({
      response: { data: { message: 'You cannot interact with this user' } },
    });

    renderWithProviders(
      <ConnectionButton userId={userId} relationshipStatus="none" />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot interact with this user'
    );
  });
});
