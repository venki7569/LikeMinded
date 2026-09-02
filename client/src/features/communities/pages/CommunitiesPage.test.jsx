import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommunitiesPage from './CommunitiesPage';

const communitiesApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  getBySlug: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  cancelJoinRequest: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

describe('CommunitiesPage', () => {
  beforeEach(() => {
    Object.values(communitiesApiMock).forEach((fn) => fn.mockReset?.());
  });

  it('shows a loading state then community cards', async () => {
    communitiesApiMock.list.mockResolvedValue({
      data: {
        data: {
          communities: [
            {
              id: '1',
              name: 'Analytical Engine',
              slug: 'analytical-engine',
              description: 'Computation and poetry',
              category: 'technology',
              memberCount: 3,
              privacy: 'public',
              interests: ['computing'],
              avatar: { url: '' },
            },
          ],
        },
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      },
    });

    renderWithProviders(<CommunitiesPage />);
    expect(screen.getByLabelText('Loading communities')).toBeInTheDocument();
    expect(await screen.findByText('Analytical Engine')).toBeInTheDocument();
    expect(screen.getByText(/3 members/)).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('submits search and category filters', async () => {
    communitiesApiMock.list.mockResolvedValue({
      data: { data: { communities: [] }, meta: { page: 1, total: 0, totalPages: 0, limit: 12 } },
    });

    renderWithProviders(<CommunitiesPage />);
    await screen.findByText('No communities matched');

    await userEvent.type(screen.getByLabelText('Search'), 'engine');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'technology');
    await userEvent.type(screen.getByLabelText('Interest'), 'computing');
    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'Most members');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(communitiesApiMock.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'engine',
          category: 'technology',
          interest: 'computing',
          sort: 'members',
        })
      )
    );
  });

  it('shows an error state', async () => {
    communitiesApiMock.list.mockRejectedValue({
      response: { data: { message: 'Unable to load communities' } },
    });

    renderWithProviders(<CommunitiesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load communities');
  });
});
