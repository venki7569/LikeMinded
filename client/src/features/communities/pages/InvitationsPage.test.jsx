import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import InvitationsPage from './InvitationsPage';

const communitiesApiMock = vi.hoisted(() => ({
  listMyInvitations: vi.fn(),
  acceptInvitation: vi.fn(),
  rejectInvitation: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

describe('InvitationsPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    communitiesApiMock.acceptInvitation.mockResolvedValue({ data: { data: { joined: true } } });
    communitiesApiMock.rejectInvitation.mockResolvedValue({ data: { data: { rejected: true } } });
  });

  it('shows a loading state then invitations', async () => {
    communitiesApiMock.listMyInvitations.mockResolvedValue({
      data: {
        data: {
          invitations: [
            {
              id: 'inv1',
              community: {
                id: 'c1',
                name: 'Analytical Engine',
                slug: 'analytical-engine',
                privacy: 'private',
                category: 'technology',
                memberCount: 4,
                interests: [],
                avatar: { url: '' },
              },
              inviter: { username: 'ada', displayName: 'Ada Lovelace' },
            },
          ],
        },
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      },
    });

    renderWithProviders(<InvitationsPage />);
    expect(screen.getByLabelText('Loading people')).toBeInTheDocument();
    expect(await screen.findByText('Analytical Engine')).toBeInTheDocument();
    expect(screen.getByText(/Invited by/)).toBeInTheDocument();
  });

  it('accepts an invitation', async () => {
    communitiesApiMock.listMyInvitations.mockResolvedValue({
      data: {
        data: {
          invitations: [
            {
              id: 'inv1',
              community: {
                name: 'Analytical Engine',
                slug: 'analytical-engine',
                privacy: 'public',
                category: 'technology',
                memberCount: 2,
                avatar: { url: '' },
              },
            },
          ],
        },
        meta: { page: 1, total: 1, totalPages: 1 },
      },
    });

    renderWithProviders(<InvitationsPage />);
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(communitiesApiMock.acceptInvitation).toHaveBeenCalledWith('inv1'));
  });

  it('declines an invitation', async () => {
    communitiesApiMock.listMyInvitations.mockResolvedValue({
      data: {
        data: {
          invitations: [
            {
              id: 'inv2',
              community: {
                name: 'Vault',
                slug: 'vault',
                privacy: 'private',
                category: 'other',
                memberCount: 1,
                avatar: { url: '' },
              },
            },
          ],
        },
        meta: { page: 1, total: 1, totalPages: 1 },
      },
    });

    renderWithProviders(<InvitationsPage />);
    expect(await screen.findByRole('button', { name: 'Decline' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(communitiesApiMock.rejectInvitation).toHaveBeenCalledWith('inv2'));
  });

  it('shows an empty state', async () => {
    communitiesApiMock.listMyInvitations.mockResolvedValue({
      data: { data: { invitations: [] }, meta: { page: 1, total: 0, totalPages: 0 } },
    });
    renderWithProviders(<InvitationsPage />);
    expect(await screen.findByText('No invitations')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    communitiesApiMock.listMyInvitations.mockRejectedValue({
      response: { data: { message: 'Unable to load invitations' } },
    });
    renderWithProviders(<InvitationsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load invitations');
  });
});
