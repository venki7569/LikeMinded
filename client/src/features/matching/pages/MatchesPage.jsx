import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  HiOutlineSparkles,
  HiOutlineCheckBadge,
  HiOutlineBriefcase,
  HiOutlineMapPin,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import EmptyState from '@/components/molecules/EmptyState';
import ConnectionButton from '@/features/connections/components/ConnectionButton';
import {
  fetchRecommendations,
  selectMatchingStatus,
  selectRecommendations,
} from '../matchingSlice';

export function MatchesPage() {
  const dispatch = useDispatch();
  const recommendations = useSelector(selectRecommendations);
  const status = useSelector(selectMatchingStatus);

  useEffect(() => {
    dispatch(fetchRecommendations({ limit: 20 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <HiOutlineSparkles className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-extrabold tracking-tight">AI Match Explorer</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalized connections matched through TF-IDF analysis, shared interests, and complementary roles.
        </p>
      </header>

      {status === 'loading' && recommendations.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Computing AI matches" />
        </div>
      ) : recommendations.length === 0 ? (
        <EmptyState
          icon={HiOutlineSparkles}
          title="No matches found yet"
          description="Try adding more skills and interests to your profile to help our AI matching engine find your ideal network."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {recommendations.map((match) => {
            const user = match.user;
            const userId = user.id || user._id;

            return (
              <div
                key={userId}
                className="card-surface overflow-hidden p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800"
              >
                <div>
                  {/* Top Bar with Match Score */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/u/${user.username}`}>
                        <Avatar name={user.displayName || user.name} src={user.profileImage?.url} size="lg" />
                      </Link>
                      <div>
                        <Link
                          to={`/u/${user.username}`}
                          className="font-bold text-base text-slate-900 hover:underline dark:text-slate-100 flex items-center gap-1.5"
                        >
                          <span>{user.displayName || user.name}</span>
                        </Link>
                        <p className="text-xs text-slate-400">@{user.username}</p>

                        {user.occupation && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <HiOutlineBriefcase className="h-3.5 w-3.5" />
                            <span>{user.occupation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-purple-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                        <HiOutlineSparkles className="h-3.5 w-3.5" />
                        {match.matchScore}% Match
                      </span>
                    </div>
                  </div>

                  {/* Why You Match Breakdown */}
                  <div className="rounded-xl bg-brand-50/60 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/40 p-3.5 mb-4">
                    <h4 className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <HiOutlineCheckBadge className="h-4 w-4" />
                      Why you match
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {match.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-brand-600 dark:text-brand-400 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Skills / Interests Preview */}
                  {user.skills && user.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Key Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {user.skills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between gap-2">
                  <Link to={`/u/${user.username}`}>
                    <Button variant="ghost" size="xs">
                      View Profile
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link to={`/messages?user=${userId}`}>
                      <Button
                        variant="secondary"
                        size="xs"
                        leftIcon={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}
                      >
                        Message
                      </Button>
                    </Link>
                    <ConnectionButton userId={userId} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MatchesPage;
