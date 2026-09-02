import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommunitySettingsPage from './CommunitySettingsPage';

const communitiesApiMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  update: vi.fn(),
  invite: vi.fn(),
  transferOwnership: vi.fn(),
  remove: vi.fn(),
}));

const profileApiMock = vi.hoisted(() => ({
  getByUsername: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

vi.mock('@/features/profile/profileApi', () => ({
  default: profileApiMock,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function ownerCommunity() {
  return {
    name: 'Analytical Engine',
    slug: 'analytical-engine',
    description: 'Computation',
    category: 'technology',
    privacy: 'public',
    interests: ['computing'],
    avatar: { url: '' },
    coverImage: { url: '' },
    viewer: {
      role: 'owner',
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canTransfer: true,
      canManageRequests: true,
    },
  };
}

function renderSettings() {
  return renderWithProviders(
    <Routes>
      <Route path="/communities/:slug/settings" element={<CommunitySettingsPage />} />
    </Routes>,
    { route: '/communities/analytical-engine/settings' }
  );
}

describe('CommunitySettingsPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    profileApiMock.getByUsername.mockReset();
    mockNavigate.mockReset();
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: { data: { community: ownerCommunity() } },
    });
    communitiesApiMock.update.mockResolvedValue({ data: { data: { community: ownerCommunity() } } });
    communitiesApiMock.remove.mockResolvedValue({ data: { data: { deleted: true } } });
  });

  it('blocks viewers without edit permission', async () => {
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: {
            ...ownerCommunity(),
            viewer: { role: 'member', canEdit: false, canDelete: false },
          },
        },
      },
    });

    renderSettings();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to manage this community.'
    );
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('saves community settings', async () => {
    renderSettings();
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Difference Engine');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(communitiesApiMock.update).toHaveBeenCalledWith(
        'analytical-engine',
        expect.objectContaining({ name: 'Difference Engine', privacy: 'public' })
      )
    );
  });

  it('hides owner-only danger zone from moderators', async () => {
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: {
            ...ownerCommunity(),
            viewer: {
              role: 'moderator',
              canEdit: true,
              canDelete: false,
              canInvite: true,
              canTransfer: false,
              canManageRequests: true,
            },
          },
        },
      },
    });

    renderSettings();
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Only the owner can change privacy.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Danger zone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Transfer ownership' })).not.toBeInTheDocument();
  });

  it('deletes the community after confirmation', async () => {
    renderSettings();
    expect(await screen.findByRole('button', { name: 'Delete community' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete community' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Delete this community?');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(communitiesApiMock.remove).toHaveBeenCalledWith('analytical-engine'));
    expect(mockNavigate).toHaveBeenCalledWith('/communities', { replace: true });
  });

  it('shows API errors when save fails', async () => {
    communitiesApiMock.update.mockRejectedValue({
      response: { data: { message: 'Slug is reserved' } },
    });
    renderSettings();
    await screen.findByRole('heading', { name: 'Settings' });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Slug is reserved');
  });
});
