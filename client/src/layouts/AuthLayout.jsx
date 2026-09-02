import { Link, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlineSparkles, HiOutlineUserGroup } from 'react-icons/hi2';
import Logo from '@/components/atoms/Logo';
import ThemeToggle from '@/components/molecules/ThemeToggle';

const HIGHLIGHTS = [
  {
    icon: HiOutlineSparkles,
    title: 'Matched by meaning',
    description: 'Sentence embeddings compare your skills and goals, not just keywords.',
  },
  {
    icon: HiOutlineUserGroup,
    title: 'Communities that fit',
    description: 'Get recommended spaces built around what you actually work on.',
  },
  {
    icon: HiOutlineChatBubbleLeftRight,
    title: 'Talk in real time',
    description: 'Direct and group chat with presence, typing and read receipts.',
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand column is decorative, so it is hidden on small screens. */}
      <aside className="bg-brand-700 relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="bg-brand-500/40 absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl"
        />

        <Link to="/" className="relative z-10 inline-flex w-fit">
          <Logo className="text-white" />
        </Link>

        <div className="relative z-10 mt-auto space-y-10">
          <h1 className="max-w-md text-4xl font-extrabold tracking-tight">
            Find the people who are building what you care about.
          </h1>

          <ul className="space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }, index) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                className="flex gap-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/75">{description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
