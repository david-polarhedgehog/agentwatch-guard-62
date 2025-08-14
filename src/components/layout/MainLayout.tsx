import { ModernSidebar } from './ModernSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Modern Sidebar */}
      <ModernSidebar />

      {/* Main content - Account for fixed sidebar */}
      <div className="flex-1 flex flex-col ml-16">
        <main className="flex-1 h-screen overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}