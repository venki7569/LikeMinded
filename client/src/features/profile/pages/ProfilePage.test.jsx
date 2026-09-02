import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import ProfilePage from './ProfilePage';

const profileApiMock = vi.hoisted(() => ({
  getByUsername: vi.fn(),
}));

vi.mock('@/features/profile/profileApi', () => ({
  default: profileApiMock,
  profileApi: profileApiMock,
}));

const publicProfile = {
  displayName: 'Ada Lovelace',
  username: 'ada',
  bio: 'Mathematician and the first computer programmer.',
  occupation: 'Analyst',
  location: { city: 'London', country: 'UK' },
  skills: ['mathematics', 'programming'],
  interests: ['computing'],
  education: [{ school: 'Home educated', degree: '', fieldOfStudy: 'Maths' }],
  experience: [],
  projects: [],
  socials: { github: 'https://github.com/ada', linkedin: '', website: '' },
  profileImage: { url: '' },
  coverImage: { url: '' },
  isOwner: false,
  completeness: null,
};

describe('ProfilePage', () => {
  beforeEach(() => {
    profileApiMock.getByUsername.mockReset();
  });

  it('renders a public profile after it loads', async () => {
    profileApiMock.getByUsername.mockResolvedValue({
      data: { data: { profile: publicProfile } },
    });

    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<ProfilePage />} />
      </Routes>,
      { route: '/u/ada' }
    );

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByText(/Mathematician/)).toBeInTheDocument();
    expect(screen.getByText('mathematics')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/ada'
    );
    expect(screen.queryByRole('link', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('shows an edit action on the owner profile', async () => {
    profileApiMock.getByUsername.mockResolvedValue({
      data: {
        data: {
          profile: {
            ...publicProfile,
            isOwner: true,
            completeness: { percentage: 40, missing: ['skills'] },
          },
        },
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<ProfilePage />} />
      </Routes>,
      { route: '/u/ada' }
    );

    expect(await screen.findByRole('link', { name: /edit profile/i })).toHaveAttribute(
      'href',
      '/settings/profile'
    );
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('explains when the profile is private', async () => {
    profileApiMock.getByUsername.mockRejectedValue({
      response: { status: 403, data: { message: 'This profile is private' } },
    });

    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<ProfilePage />} />
      </Routes>,
      { route: '/u/ada' }
    );

    expect(await screen.findByText('This profile is private')).toBeInTheDocument();
  });
});
