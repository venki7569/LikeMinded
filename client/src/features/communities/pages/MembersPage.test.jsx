import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import MembersPage from './MembersPage';

const communitiesApiMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  listMembers: vi.fn(),
  promoteModerator: vi.fn(),
  demoteModerator: vi.fn(),
  removeMember: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

const ada = { id: 'u1', displayName: 'Ada Lovelace', username: 'ada', profileImage: { url: '' } };
const grace = { id: 'u2', displayName: 'Grace Hopper', username: 'grace', profileImage: { url: '' } };
const alan = { id: 'u3', displayName: 'Alan Turing', username: 'alan', profileImage: { url: '' } };

function ownerCommunity() {
  return {
    name: 'Analytical Engine',
    slug: 'analytical-engine',
    viewer: { role: 'owner', canManageMembers: true },
  };
}

function renderMembers(route = '/communities/analytical-engine/members') {
  return renderWithProviders(
    <Routes>
      <Route path="/communities/:slug/members" element={<MembersPage />} />
    </Routes>,
    { route }
  );
}

describe('MembersPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: { data: { community: ownerCommunity() } },
    });
    communitiesApiMock.listMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            { id: 'm1', role: 'owner', user: ada },
            { id: 'm2', role: 'member', user: grace },
            { id: 'm3', role: 'moderator', user: alan },
          ],
        },
        meta: { page: 1, limit: 12, total: 3, totalPages: 1 },
      },
    });
    communitiesApiMock.promoteModerator.mockResolvedValue({ data: { data: { promoted: true } } });
    communitiesApiMock.demoteModerator.mockResolvedValue({ data: { data: { demoted: true } } });
    communitiesApiMock.removeMember.mockResolvedValue({ data: { data: { removed: true } } });
  });

  it('lists members with role badges', async () => {
    renderMembers();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/@ada · owner/i)).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });

  it('lets the owner promote, demote and remove members', async () => {
    renderMembers();
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Make moderator' }));
    await waitFor(() =>
      expect(communitiesApiMock.promoteModerator).toHaveBeenCalledWith('analytical-engine', 'u2')
    );

    await userEvent.click(screen.getByRole('button', { name: 'Demote' }));
    await waitFor(() =>
      expect(communitiesApiMock.demoteModerator).toHaveBeenCalledWith('analytical-engine', 'u3')
    );

    const graceRow = screen.getByText('Grace Hopper').closest('li');
    await userEvent.click(within(graceRow).getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Remove this member?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(communitiesApiMock.removeMember).toHaveBeenCalledWith('analytical-engine', 'u2')
    );
  });

  it('hides management actions from regular members', async () => {
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: {
            name: 'Analytical Engine',
            slug: 'analytical-engine',
            viewer: { role: 'member', canManageMembers: false },
          },
        },
      },
    });

    renderMembers();
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make moderator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('filters members by role', async () => {
    renderMembers();
    await screen.findByText('Grace Hopper');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'moderator');
    await waitFor(() =>
      expect(communitiesApiMock.listMembers).toHaveBeenCalledWith(
        'analytical-engine',
        expect.objectContaining({ role: 'moderator' })
      )
    );
  });

  it('shows an error state', async () => {
    communitiesApiMock.listMembers.mockRejectedValue({
      response: { data: { message: 'Unable to load members' } },
    });
    renderMembers();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load members');
  });
});
