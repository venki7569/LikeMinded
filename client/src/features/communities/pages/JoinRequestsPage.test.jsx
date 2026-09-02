import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import JoinRequestsPage from './JoinRequestsPage';

const communitiesApiMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  listJoinRequests: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

describe('JoinRequestsPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: { data: { community: { name: 'Vault', slug: 'vault', viewer: { canManageRequests: true } } } },
    });
    communitiesApiMock.listJoinRequests.mockResolvedValue({
      data: {
        data: {
          requests: [
            {
              id: 'req1',
              user: { id: 'u2', displayName: 'Grace Hopper', username: 'grace', profileImage: { url: '' } },
            },
          ],
        },
        meta: { page: 1, total: 1, totalPages: 1 },
      },
    });
    communitiesApiMock.approveJoinRequest.mockResolvedValue({ data: { data: { approved: true } } });
  });

  it('approves an incoming request', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/communities/:slug/requests" element={<JoinRequestsPage />} />
      </Routes>,
      { route: '/communities/vault/requests' }
    );

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(communitiesApiMock.approveJoinRequest).toHaveBeenCalledWith('vault', 'req1')
    );
  });

  it('rejects an incoming request', async () => {
    communitiesApiMock.rejectJoinRequest.mockResolvedValue({ data: { data: { rejected: true } } });
    renderWithProviders(
      <Routes>
        <Route path="/communities/:slug/requests" element={<JoinRequestsPage />} />
      </Routes>,
      { route: '/communities/vault/requests' }
    );

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() =>
      expect(communitiesApiMock.rejectJoinRequest).toHaveBeenCalledWith('vault', 'req1')
    );
  });
});
