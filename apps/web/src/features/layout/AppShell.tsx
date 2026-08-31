import MainContent from './MainContent';
import Sidebar from './Sidebar';

const AppShell = () => (
  <div className="h-screen grid grid-cols-[240px_1fr] bg-background text-foreground">
    <Sidebar />
    <MainContent />
  </div>
);
export default AppShell;
