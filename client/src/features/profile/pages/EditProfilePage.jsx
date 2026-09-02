import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import CompletenessBar from '@/components/molecules/CompletenessBar';
import FormField from '@/components/molecules/FormField';
import TagInput from '@/components/molecules/TagInput';
import { Skeleton } from '@/components/atoms/Skeleton';
import { setUser, selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import profileApi from '@/features/profile/profileApi';
import {
  fetchOwnProfile,
  saveOwnProfile,
  selectProfileError,
  selectProfileStatus,
  selectViewedProfile,
} from '@/features/profile/profileSlice';

const emptyEducation = { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' };
const emptyExperience = {
  company: '',
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
};
const emptyProject = { title: '', description: '', url: '', technologies: '' };

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function profileToForm(profile) {
  return {
    displayName: profile.displayName ?? profile.name ?? '',
    username: profile.username ?? '',
    bio: profile.bio ?? '',
    occupation: profile.occupation ?? '',
    city: profile.location?.city ?? '',
    country: profile.location?.country ?? '',
    profileImageUrl: profile.profileImage?.url ?? '',
    coverImageUrl: profile.coverImage?.url ?? '',
    github: profile.socials?.github ?? '',
    linkedin: profile.socials?.linkedin ?? '',
    website: profile.socials?.website ?? '',
    profileVisibility: profile.profileVisibility ?? 'public',
    skills: profile.skills ?? [],
    interests: profile.interests ?? [],
    education: profile.education?.length
      ? profile.education.map((item) => ({
          school: item.school ?? '',
          degree: item.degree ?? '',
          fieldOfStudy: item.fieldOfStudy ?? '',
          startYear: item.startYear ?? '',
          endYear: item.endYear ?? '',
        }))
      : [emptyEducation],
    experience: profile.experience?.length
      ? profile.experience.map((item) => ({
          company: item.company ?? '',
          title: item.title ?? '',
          location: item.location ?? '',
          startDate: toDateInput(item.startDate),
          endDate: toDateInput(item.endDate),
          isCurrent: Boolean(item.isCurrent),
          description: item.description ?? '',
        }))
      : [emptyExperience],
    projects: profile.projects?.length
      ? profile.projects.map((item) => ({
          title: item.title ?? '',
          description: item.description ?? '',
          url: item.url ?? '',
          technologies: (item.technologies ?? []).join(', '),
        }))
      : [emptyProject],
  };
}

function formToPayload(values) {
  return {
    displayName: values.displayName,
    username: values.username,
    bio: values.bio,
    occupation: values.occupation,
    profileVisibility: values.profileVisibility,
    location: { city: values.city, country: values.country },
    profileImage: { url: values.profileImageUrl },
    coverImage: { url: values.coverImageUrl },
    socials: { github: values.github, linkedin: values.linkedin, website: values.website },
    skills: values.skills,
    interests: values.interests,
    education: (values.education ?? [])
      .filter((item) => item.school?.trim())
      .map((item) => ({
        ...item,
        startYear: item.startYear ? Number(item.startYear) : undefined,
        endYear: item.endYear ? Number(item.endYear) : undefined,
      })),
    experience: (values.experience ?? [])
      .filter((item) => item.company?.trim() && item.title?.trim())
      .map((item) => ({
        ...item,
        startDate: item.startDate || undefined,
        endDate: item.isCurrent ? undefined : item.endDate || undefined,
      })),
    projects: (values.projects ?? [])
      .filter((item) => item.title?.trim())
      .map((item) => ({
        title: item.title,
        description: item.description,
        url: item.url,
        technologies: item.technologies
          ? item.technologies.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
      })),
  };
}

function EditorSection({ title, description, children }) {
  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <h2 className="font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function EditProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const me = useSelector(selectCurrentUser);
  const profile = useSelector(selectViewedProfile);
  const status = useSelector(selectProfileStatus);
  const error = useSelector(selectProfileError);
  const [skills, setSkills] = useState([]);
  const [interests, setInterests] = useState([]);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: profileToForm({}),
  });

  const education = useFieldArray({ control, name: 'education' });
  const experience = useFieldArray({ control, name: 'experience' });
  const projects = useFieldArray({ control, name: 'projects' });

  const watchedUsername = watch('username');
  const originalUsername = profile?.username ?? me?.username;
  const profileImageUrl = watch('profileImageUrl');
  const coverImageUrl = watch('coverImageUrl');
  const visibility = watch('profileVisibility');

  useEffect(() => {
    dispatch(fetchOwnProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!profile?.isOwner && profile?.username && me?.username && profile.username !== me.username) {
      return;
    }
    if (profile && (profile.isOwner || profile.username === me?.username)) {
      reset(profileToForm(profile));
      setSkills(profile.skills ?? []);
      setInterests(profile.interests ?? []);
    }
  }, [profile, me, reset]);

  useEffect(() => {
    const value = (watchedUsername ?? '').trim().toLowerCase();
    if (!value || value.length < 3) {
      setUsernameStatus(null);
      return undefined;
    }
    if (value === originalUsername) {
      setUsernameStatus({ available: true, reason: 'current' });
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await profileApi.checkUsername(value);
        setUsernameStatus(response.data.data);
      } catch {
        setUsernameStatus(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedUsername, originalUsername]);

  const usernameHint = useMemo(() => {
    if (!usernameStatus) return 'Letters, numbers and underscores.';
    if (usernameStatus.available && usernameStatus.reason === 'current') return 'This is your current username.';
    if (usernameStatus.available) return 'This username is available.';
    if (usernameStatus.reason === 'reserved') return 'This username is reserved.';
    return 'This username is taken.';
  }, [usernameStatus]);

  const onSubmit = async (values) => {
    if (usernameStatus && !usernameStatus.available) {
      setError('username', { message: 'That username is not available' });
      return;
    }

    setIsSaving(true);
    const payload = { ...formToPayload(values), skills, interests };
    const result = await dispatch(saveOwnProfile(payload));
    setIsSaving(false);

    if (saveOwnProfile.fulfilled.match(result)) {
      const saved = result.payload.profile;
      dispatch(
        setUser({
          ...me,
          name: saved.name,
          username: saved.username,
          bio: saved.bio,
          avatar: saved.avatar,
          occupation: saved.occupation,
        })
      );
      dispatch(pushToast({ message: 'Profile saved', tone: 'success' }));
      navigate(`/u/${saved.username}`);
      return;
    }

    const apiError = result.payload;
    if (apiError?.fieldErrors) {
      Object.entries(apiError.fieldErrors).forEach(([field, message]) => {
        setError(field, { message });
      });
    }
  };

  if (status === 'loading' && !profile) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading editor">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Edit profile</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            These fields are what the matching engine will read later.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/u/${originalUsername ?? ''}`}>
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            Save profile
          </Button>
        </div>
      </header>

      {profile?.completeness && <CompletenessBar completeness={profile.completeness} />}

      {error && status === 'failed' && !isSaving && <Alert tone="error">{error}</Alert>}

      <EditorSection title="1. Basic information" description="How you appear across LikeMinded.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Display name"
            error={errors.displayName?.message}
            {...register('displayName', {
              required: 'Enter your name',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          <FormField
            label="Username"
            error={errors.username?.message}
            hint={usernameHint}
            {...register('username', {
              required: 'Choose a username',
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: 'Only letters, numbers and underscores',
              },
            })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Occupation" {...register('occupation')} placeholder="e.g. ML Engineer" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Visibility</p>
            <select
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              {...register('profileVisibility')}
            >
              <option value="public">Public — anyone can view</option>
              <option value="private">Private — only you</option>
            </select>
            <p className="text-xs text-slate-500">
              {visibility === 'private'
                ? 'Your profile is hidden from other members.'
                : 'Anyone with the link can view your profile.'}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="City" {...register('city')} />
          <FormField label="Country" {...register('country')} />
        </div>
      </EditorSection>

      <EditorSection title="2. About" description="A short bio used for matching.">
        <FormField
          label="Bio"
          multiline
          rows={5}
          maxLength={500}
          hint="At least 20 characters counts toward completeness."
          error={errors.bio?.message}
          {...register('bio', { maxLength: { value: 500, message: 'Bio must be at most 500 characters' } })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormField
              label="Profile image URL"
              placeholder="https://"
              hint="https image URL for now. Cloudinary uploads come later."
              {...register('profileImageUrl')}
            />
            {profileImageUrl && (
              <img src={profileImageUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            )}
          </div>
          <div className="space-y-2">
            <FormField
              label="Cover image URL"
              placeholder="https://"
              {...register('coverImageUrl')}
            />
            {coverImageUrl && (
              <img src={coverImageUrl} alt="" className="h-20 w-full rounded-xl object-cover" />
            )}
          </div>
        </div>
      </EditorSection>

      <EditorSection title="3. Skills" description="Up to 20. At least three improves your match quality.">
        <TagInput label="Skills" values={skills} onChange={setSkills} placeholder="e.g. React" />
      </EditorSection>

      <EditorSection title="4. Interests">
        <TagInput
          label="Interests"
          values={interests}
          onChange={setInterests}
          placeholder="e.g. Startups"
        />
      </EditorSection>

      <EditorSection title="5. Education">
        <div className="space-y-4">
          {education.fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="School" {...register(`education.${index}.school`)} />
                <FormField label="Degree" {...register(`education.${index}.degree`)} />
                <FormField label="Field of study" {...register(`education.${index}.fieldOfStudy`)} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start year" type="number" {...register(`education.${index}.startYear`)} />
                  <FormField label="End year" type="number" {...register(`education.${index}.endYear`)} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => education.remove(index)}
                leftIcon={<HiOutlineTrash className="h-4 w-4" />}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => education.append(emptyEducation)}
            leftIcon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Add education
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="6. Experience">
        <div className="space-y-4">
          {experience.fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Title" {...register(`experience.${index}.title`)} />
                <FormField label="Company" {...register(`experience.${index}.company`)} />
                <FormField label="Location" {...register(`experience.${index}.location`)} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register(`experience.${index}.isCurrent`)} />
                  Current role
                </label>
                <FormField label="Start date" type="date" {...register(`experience.${index}.startDate`)} />
                <FormField label="End date" type="date" {...register(`experience.${index}.endDate`)} />
              </div>
              <FormField
                label="Description"
                multiline
                rows={3}
                {...register(`experience.${index}.description`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => experience.remove(index)}
                leftIcon={<HiOutlineTrash className="h-4 w-4" />}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => experience.append(emptyExperience)}
            leftIcon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Add experience
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="7. Projects">
        <div className="space-y-4">
          {projects.fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <FormField label="Title" {...register(`projects.${index}.title`)} />
              <FormField
                label="Description"
                multiline
                rows={3}
                {...register(`projects.${index}.description`)}
              />
              <FormField label="URL" placeholder="https://" {...register(`projects.${index}.url`)} />
              <FormField
                label="Technologies"
                hint="Comma-separated"
                {...register(`projects.${index}.technologies`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => projects.remove(index)}
                leftIcon={<HiOutlineTrash className="h-4 w-4" />}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => projects.append(emptyProject)}
            leftIcon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Add project
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="8. Social links">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="GitHub" placeholder="https://github.com/you" {...register('github')} />
          <FormField
            label="LinkedIn"
            placeholder="https://www.linkedin.com/in/you"
            {...register('linkedin')}
          />
          <FormField label="Website" placeholder="https://" {...register('website')} />
        </div>
      </EditorSection>

      <div className="flex justify-end gap-2 pb-8">
        <Link to={`/u/${originalUsername ?? ''}`}>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" size="lg" isLoading={isSaving}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

export default EditProfilePage;
