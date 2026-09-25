import { Link } from 'react-router';
import { UserMenu } from './UserMenu';

/** Header of the pages outside a vault (vault list, settings). */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <Link to="/vaults" className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="size-7" />
        <span className="text-xl font-semibold tracking-tight text-primary">Lily</span>
      </Link>
      <UserMenu />
    </header>
  );
}
