import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-svh">
      <Header />
      <main className="mx-auto w-full max-w-[800px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
