import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import TagInput from '@/components/molecules/TagInput';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import { COMMUNITY_CATEGORIES } from '../categories';
import { createCommunity } from '../communitiesSlice';
import { useState } from 'react';

export function CreateCommunityPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [apiError, setApiError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      category: 'other',
      privacy: 'public',
      avatarUrl: '',
      coverImageUrl: '',
    },
  });

  const onSubmit = async (values) => {
    setApiError(null);
    const result = await dispatch(
      createCommunity({
        name: values.name,
        description: values.description,
        category: values.category,
        privacy: values.privacy,
        interests,
        avatar: values.avatarUrl ? { url: values.avatarUrl } : undefined,
        coverImage: values.coverImageUrl ? { url: values.coverImageUrl } : undefined,
      })
    );
    if (createCommunity.fulfilled.match(result)) {
      const slug = result.payload.data?.community?.slug;
      dispatch(pushToast({ message: 'Community created', tone: 'success' }));
      navigate(slug ? `/communities/${slug}` : '/communities', { replace: true });
      return;
    }
    setApiError(result.payload?.message ?? toApiError(result).message);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Create a community</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You become the owner. A public group can be joined immediately; a private one requires
          approval.
        </p>
      </header>

      {apiError && <Alert tone="error">{apiError}</Alert>}

      <form className="card-surface space-y-4 p-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Enter a name',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />
        <FormField
          label="Description"
          multiline
          rows={5}
          error={errors.description?.message}
          {...register('description', {
            maxLength: { value: 2000, message: 'Keep the description under 2000 characters' },
          })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="category" className="block text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              {...register('category')}
            >
              {COMMUNITY_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Privacy</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="public" {...register('privacy')} />
              Public — anyone can join
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="private" {...register('privacy')} />
              Private — join requests
            </label>
          </fieldset>
        </div>
        <TagInput label="Interests" values={interests} onChange={setInterests} />
        <FormField label="Avatar URL" hint="Optional http(s) image URL" {...register('avatarUrl')} />
        <FormField
          label="Cover image URL"
          hint="Optional http(s) image URL"
          {...register('coverImageUrl')}
        />
        <Button type="submit" isLoading={isSubmitting} fullWidth>
          Create community
        </Button>
      </form>
    </div>
  );
}

export default CreateCommunityPage;
