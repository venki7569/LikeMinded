import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CreateCommunityPage from './CreateCommunityPage';

const communitiesApiMock = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('@/features/communities/communitiesApi', () => ({
  default: communitiesApiMock,
  communitiesApi: communitiesApiMock,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('CreateCommunityPage', () => {
  beforeEach(() => {
    communitiesApiMock.create.mockReset();
    mockNavigate.mockReset();
  });

  it('validates the name client-side', async () => {
    renderWithProviders(<CreateCommunityPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create community' }));
    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(communitiesApiMock.create).not.toHaveBeenCalled();
  });

  it('creates a community and navigates', async () => {
    communitiesApiMock.create.mockResolvedValue({
      data: { data: { community: { slug: 'analytical-engine' } } },
    });

    renderWithProviders(<CreateCommunityPage />);
    await userEvent.type(screen.getByLabelText('Name'), 'Analytical Engine');
    await userEvent.click(screen.getByRole('button', { name: 'Create community' }));

    await waitFor(() => expect(communitiesApiMock.create).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/communities/analytical-engine', { replace: true });
  });

  it('shows API errors', async () => {
    communitiesApiMock.create.mockRejectedValue({
      response: { data: { message: 'Validation failed' } },
    });

    renderWithProviders(<CreateCommunityPage />);
    await userEvent.type(screen.getByLabelText('Name'), 'Analytical Engine');
    await userEvent.click(screen.getByRole('button', { name: 'Create community' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed');
  });
});
