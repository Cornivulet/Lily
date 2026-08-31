import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const Sidebar = () => (
  <aside className="flex h-screen flex-col p-4 bg-primary text-primary-foreground">
    <header className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight">Lily</h1>
      <p className="mt-1 text-sm opacity-75">Your stinky notebook</p>
    </header>
    <Separator className="bg-primary-foreground/20" />
    <nav className="flex-1 py-4">
      <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider opacity-60">
        Explorer
      </h2>
      <ul className="space-y-1">
        <li>
          <Button className="w-full justify-start rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary-foreground/10">
            Note 1
          </Button>
        </li>
        <li>
          <Button className="w-full justify-start rounded-md px-3 py-2  text-sm transition-colors hover:bg-primary-foreground/10">
            Note 2
          </Button>
        </li>
        <li>
          <Button className="w-full justify-start rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary-foreground/10">
            Projects
          </Button>
        </li>
      </ul>
    </nav>
    <Separator className="bg-primary-foreground/20" />

    <footer className="pt-4">
      <Button className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary-foreground/10">
        Settings
      </Button>
    </footer>
  </aside>
);
export default Sidebar;
