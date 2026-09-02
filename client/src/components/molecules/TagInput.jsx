import { useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { cn } from '@/utils/cn';

export function TagInput({
  label,
  values = [],
  onChange,
  error,
  hint = 'Press Enter or comma to add.',
  placeholder = 'Add a tag',
  maxItems = 20,
}) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const tag = raw.trim();
    if (tag.length < 2) return;
    const exists = values.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (exists || values.length >= maxItems) {
      setDraft('');
      return;
    }
    onChange([...values, tag]);
    setDraft('');
  };

  const remove = (index) => onChange(values.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      )}
      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5',
          'dark:bg-slate-900',
          error ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
        )}
      >
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove ${tag}`}
              className="hover:text-brand-900"
            >
              <HiOutlineXMark className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            }
            if (event.key === 'Backspace' && !draft && values.length) {
              remove(values.length - 1);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={values.length >= maxItems ? 'Limit reached' : placeholder}
          disabled={values.length >= maxItems}
          className="min-w-28 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export default TagInput;
