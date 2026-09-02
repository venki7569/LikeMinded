import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineMagnifyingGlass, HiOutlineUsers } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import Pagination from '@/components/molecules/Pagination';
import PeopleList, { PeopleListSkeleton } from '@/features/connections/components/PeopleList';
import {
  fetchPeople,
  selectPeople,
  setPeopleFilters,
} from '@/features/connections/connectionsSlice';

export function PeoplePage() {
  const dispatch = useDispatch();
  const { items, meta, status, error, filters } = useSelector(selectPeople);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    dispatch(fetchPeople({ ...filters, page, limit: 12 }));
  }, [dispatch, filters, page]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    dispatch(setPeopleFilters(draft));
  };

  const updateDraft = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">People you may know</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Search by name or username, then filter by what you have in common. Matching scores
          arrive later.
        </p>
      </header>

      <form className="card-surface space-y-4 p-5" onSubmit={applyFilters}>
        <FormField
          label="Search"
          placeholder="Name or username"
          value={draft.q}
          onChange={updateDraft('q')}
          leftIcon={<HiOutlineMagnifyingGlass className="h-5 w-5" />}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Skill" value={draft.skill} onChange={updateDraft('skill')} />
          <FormField label="Interest" value={draft.interest} onChange={updateDraft('interest')} />
          <FormField
            label="Occupation"
            value={draft.occupation}
            onChange={updateDraft('occupation')}
          />
          <FormField label="Location" value={draft.city} onChange={updateDraft('city')} hint="City" />
        </div>
        <Button type="submit" leftIcon={<HiOutlineUsers className="h-5 w-5" />}>
          Search
        </Button>
      </form>

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      {status === 'loading' || status === 'idle' ? (
        <PeopleListSkeleton />
      ) : (
        <>
          <PeopleList
            items={items}
            emptyTitle="No people matched those filters"
            emptyDescription="Try a broader search, or complete your own profile so others can find you too."
            onChanged={() => dispatch(fetchPeople({ ...filters, page, limit: 12 }))}
          />
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default PeoplePage;
