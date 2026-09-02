import { HiOutlineBriefcase, HiOutlineLink, HiOutlineMapPin } from 'react-icons/hi2';
import { cn } from '@/utils/cn';

export function Chip({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700',
        'dark:bg-slate-800 dark:text-slate-200',
        className
      )}
    >
      {children}
    </span>
  );
}

export function Section({ title, icon: Icon, children, empty, isEmpty }) {
  return (
    <section className="card-surface p-6">
      <header className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="text-brand-600 h-5 w-5" aria-hidden="true" />}
        <h2 className="font-bold">{title}</h2>
      </header>
      {isEmpty ? <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p> : children}
    </section>
  );
}

export function MetaRow({ icon: Icon = HiOutlineMapPin, children }) {
  if (!children) return null;
  return (
    <p className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Timeline({ items, renderTitle, renderMeta, renderBody }) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item._id ?? index} className="relative pl-5">
          <span className="bg-brand-600 absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full" />
          <p className="font-semibold">{renderTitle(item)}</p>
          {renderMeta && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{renderMeta(item)}</p>
          )}
          {renderBody?.(item) && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{renderBody(item)}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function SocialLinks({ socials = {} }) {
  const links = [
    { href: socials.github, label: 'GitHub' },
    { href: socials.linkedin, label: 'LinkedIn' },
    { href: socials.website, label: 'Website' },
  ].filter((item) => item.href);

  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <HiOutlineLink className="h-4 w-4" />
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export { HiOutlineBriefcase };
