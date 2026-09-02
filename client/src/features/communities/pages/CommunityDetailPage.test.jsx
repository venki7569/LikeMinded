import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommunityDetailPage from './CommunityDetailPage';

const communitiesApiMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  listMembers: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/communities/:slug" element={<CommunityDetailPage />} />
    </Routes>,
    { route: '/communities/vault' }
  );
}

describe('CommunityDetailPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
    communitiesApiMock.listMembers.mockResolvedValue({
      data: { data: { members: [] }, meta: {} },
    });
  });

  it('renders a public community', async () => {
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: {
            name: 'Analytical Engine',
            slug: 'analytical-engine',
            description: 'Computation and poetry',
            category: 'technology',
            privacy: 'public',
            memberCount: 4,
            interests: ['computing'],
            owner: { username: 'ada', displayName: 'Ada Lovelace' },
            viewer: { isMember: false, role: null },
            avatar: { url: '' },
            coverImage: { url: '' },
          },
        },
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/communities/:slug" element={<CommunityDetailPage />} />
      </Routes>,
      { route: '/communities/analytical-engine' }
    );

    expect(await screen.findByRole('heading', { name: 'Analytical Engine' })).toBeInTheDocument();
    expect(screen.getByText(/Computation and poetry/)).toBeInTheDocument();
    expect(screen.getByText('computing')).toBeInTheDocument();
  });

  it('hides members for private non-members', async () => {
    communitiesApiMock.getBySlug.mockResolvedValue({
      data: {
        data: {
          community: {
            name: 'Vault',
            slug: 'vault',
            privacy: 'private',
            memberCount: 2,
            category: 'other',
            interests: [],
            viewer: { isMember: false },
            avatar: { url: '' },
            coverImage: { url: '' },
          },
        },
      },
    });

    renderDetail();
    expect(await screen.findByText('This community is private')).toBeInTheDocument();
    expect(screen.getByText('Members are hidden')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Members' })).not.toBeInTheDocument();
  });
});
