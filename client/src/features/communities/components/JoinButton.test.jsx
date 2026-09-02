import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import JoinButton from './JoinButton';

const communitiesApiMock = vi.hoisted(() => ({
  join: vi.fn(),
  leave: vi.fn(),
  cancelJoinRequest: vi.fn(),
  getBySlug: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

const publicCommunity = {
  slug: 'analytical-engine',
  privacy: 'public',
  viewer: { isMember: false, role: null, joinRequestId: null },
};

describe('JoinButton', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: { data: { community: { ...publicCommunity, viewer: { isMember: true, role: 'member' } } } },
    });
  });

  it('asks anonymous visitors to sign in', () => {
    renderWithProviders(<JoinButton community={publicCommunity} />);
    expect(screen.getByRole('link', { name: 'Sign in to join' })).toHaveAttribute('href', '/login');
  });

  it('joins a public community', async () => {
    communitiesApiMock.join.mockResolvedValue({ data: { data: { state: 'joined' } } });
    renderWithProviders(<JoinButton community={publicCommunity} />, {
      preloadedState: { auth: { user: { id: '1', username: 'ada' }, isAuthenticated: true } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(communitiesApiMock.join).toHaveBeenCalledWith('analytical-engine'));
  });

  it('shows a pending request that can be cancelled', async () => {
    communitiesApiMock.cancelJoinRequest.mockResolvedValue({ data: { data: { cancelled: true } } });
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: { slug: 'vault', privacy: 'private', viewer: { isMember: false, joinRequestId: null } },
        },
      },
    });

    renderWithProviders(
      <JoinButton
        community={{
          slug: 'vault',
          privacy: 'private',
          viewer: { isMember: false, joinRequestId: 'abc', role: null },
        }}
      />,
      { preloadedState: { auth: { user: { id: '1' }, isAuthenticated: true } } }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Request pending' }));
    await waitFor(() =>
      expect(communitiesApiMock.cancelJoinRequest).toHaveBeenCalledWith('vault', 'abc')
    );
  });

  it('leaves a community after confirmation', async () => {
    communitiesApiMock.leave.mockResolvedValue({ data: { data: { left: true } } });
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: { ...publicCommunity, viewer: { isMember: false, role: null } },
        },
      },
    });

    renderWithProviders(
      <JoinButton
        community={{
          ...publicCommunity,
          viewer: { isMember: true, role: 'member', joinRequestId: null },
        }}
      />,
      { preloadedState: { auth: { user: { id: '1' }, isAuthenticated: true } } }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Leave this community?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(communitiesApiMock.leave).toHaveBeenCalledWith('analytical-engine'));
  });

  it('shows an error when join fails', async () => {
    communitiesApiMock.join.mockRejectedValue({
      response: { data: { message: 'You are already a member of this community' } },
    });
    renderWithProviders(<JoinButton community={publicCommunity} />, {
      preloadedState: { auth: { user: { id: '1' }, isAuthenticated: true } },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already a member');
  });
});
