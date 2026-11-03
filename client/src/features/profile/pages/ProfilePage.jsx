import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineLockClosed,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlineRectangleGroup,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import { Skeleton, SkeletonText } from '@/components/atoms/Skeleton';
import CompletenessBar from '@/components/molecules/CompletenessBar';
import EmptyState from '@/components/molecules/EmptyState';
import { selectCurrentUser } from '@/features/auth/authSlice';
import ConnectionButton from '@/features/connections/components/ConnectionButton';
import MutualConnections from '@/features/connections/components/MutualConnections';
import { selectRelationship } from '@/features/connections/connectionsSlice';
import {
  Chip,
  MetaRow,
  Section,
  SocialLinks,
  Timeline,
} from '@/features/profile/components/ProfileParts';
import FeedList from '@/features/posts/components/FeedList';
import { fetchProfileFeed, selectFeed } from '@/features/posts/postSlice';
import {
  clearViewedProfile,
  fetchProfileByUsername,
  selectProfileError,
  selectProfileStatus,
  selectViewedProfile,
} from '@/features/profile/profileSlice';

function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <Skeleton className="h-44 w-full" rounded="rounded-card" />
      <div className="flex gap-4">
        <Skeleton className="h-28 w-28" rounded="rounded-full" />
        <div className="flex-1 space-y-2 pt-10">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}

function yearRange(start, end) {
  if (!start && !end) return '';
  return [start, end ?? 'present'].filter(Boolean).join(' – ');
}

export function ProfilePage() {
  const { username } = useParams();
  const dispatch = useDispatch();
  const profile = useSelector(selectViewedProfile);
  const status = useSelector(selectProfileStatus);
  const error = useSelector(selectProfileError);
  const me = useSelector(selectCurrentUser);
  const relationship = useSelector(selectRelationship(profile?.id));
  const feed = useSelector(selectFeed);

  useEffect(() => {
    dispatch(fetchProfileByUsername(username));
    dispatch(fetchProfileFeed({ username }));
    return () => dispatch(clearViewedProfile());
  }, [dispatch, username]);

  if (status === 'loading' || status === 'idle') return <ProfileSkeleton />;

  if (status === 'failed') {
    const isPrivate = /private/i.test(error ?? '');
    return (
      <EmptyState
        icon={isPrivate ? HiOutlineLockClosed : HiOutlineSparkles}
        title={isPrivate ? 'This profile is private' : 'Profile not found'}
        description={
          isPrivate
            ? 'The owner has limited who can see this page.'
            : error ?? 'We could not find that person.'
        }
      />
    );
  }

  if (!profile) return <ProfileSkeleton />;

  const isOwner = profile.isOwner || profile.username === me?.username;
  const location = [profile.location?.city, profile.location?.country].filter(Boolean).join(', ');

  return (
    <article className="space-y-6">
      <div className="card-surface overflow-hidden">
        <div className="from-brand-600 relative h-44 bg-linear-to-r to-violet-500">
          {profile.coverImage?.url && (
            <img
              src={profile.coverImage.url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={profile.displayName} src={profile.profileImage?.url} size="lg" />
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold tracking-tight">{profile.displayName}</h1>
                <p className="text-slate-500 dark:text-slate-400">@{profile.username}</p>
              </div>
            </div>
            {isOwner ? (
              <Link to="/settings/profile">
                <Button
                  variant="secondary"
                  leftIcon={<HiOutlinePencilSquare className="h-5 w-5" />}
                >
                  Edit profile
                </Button>
              </Link>
            ) : (
              profile.id && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ConnectionButton userId={profile.id} showStatus />
                    <Link to={`/messages?user=${profile.id}`}>
                      <Button variant="secondary" size="sm">
                        Message
                      </Button>
                    </Link>
                  </div>
                  <MutualConnections count={relationship?.mutualConnectionCount ?? 0} />
                </div>
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <MetaRow icon={HiOutlineBriefcase}>{profile.occupation}</MetaRow>
            <MetaRow icon={HiOutlineMapPin}>{location}</MetaRow>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-200">{profile.bio}</p>
          )}

          <div className="mt-4">
            <SocialLinks socials={profile.socials} />
          </div>
        </div>
      </div>

      {isOwner && profile.completeness && (
        <div className="card-surface p-6">
          <CompletenessBar completeness={profile.completeness} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Skills"
          icon={HiOutlineSparkles}
          isEmpty={!profile.skills?.length}
          empty="No skills listed yet."
        >
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
          </div>
        </Section>

        <Section
          title="Interests"
          isEmpty={!profile.interests?.length}
          empty="No interests listed yet."
        >
          <div className="flex flex-wrap gap-2">
            {profile.interests?.map((interest) => (
              <Chip key={interest}>{interest}</Chip>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title="Education"
        icon={HiOutlineAcademicCap}
        isEmpty={!profile.education?.length}
        empty="No education added yet."
      >
        <Timeline
          items={profile.education}
          renderTitle={(item) => item.school}
          renderMeta={(item) =>
            [item.degree, item.fieldOfStudy, yearRange(item.startYear, item.endYear)]
              .filter(Boolean)
              .join(' · ')
          }
        />
      </Section>

      <Section
        title="Experience"
        icon={HiOutlineBriefcase}
        isEmpty={!profile.experience?.length}
        empty="No experience added yet."
      >
        <Timeline
          items={profile.experience}
          renderTitle={(item) => `${item.title} · ${item.company}`}
          renderMeta={(item) =>
            [item.location, item.isCurrent ? 'Current' : null].filter(Boolean).join(' · ')
          }
          renderBody={(item) => item.description}
        />
      </Section>

      <Section
        title="Projects"
        icon={HiOutlineRectangleGroup}
        isEmpty={!profile.projects?.length}
        empty="No projects added yet."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {profile.projects?.map((project, index) => (
            <li key={project._id ?? index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="font-semibold">{project.title}</p>
              {project.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
              )}
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-brand-600 dark:text-brand-400 mt-2 inline-block text-sm font-medium hover:underline"
                >
                  View project
                </a>
              )}
              {project.technologies?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <Chip key={tech}>{tech}</Chip>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* User Posts Section */}
      <section className="space-y-4 pt-2">
        <h2 className="text-lg font-bold">Posts by {profile.displayName || profile.name}</h2>
        <FeedList
          posts={feed.items}
          status={feed.status}
          error={feed.error}
          emptyMessage={`${profile.displayName || profile.name} hasn't shared any posts yet.`}
        />
      </section>
    </article>
  );
}

export default ProfilePage;
