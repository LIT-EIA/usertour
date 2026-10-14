import { LanguageSwitcher } from './components/language-switcher';
import { MAIN_CONTENT_ID } from './components/skip-link';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <>
      <div className="container relative min-h-screen flex flex-col items-center justify-center grid max-w-none grid-cols-1 px-0">
        <div className="relative items-center justify-center h-full flex flex-col bg-muted px-4 pb-4 pt-16 sm:p-10 text-white dark:border-r flex bg-gradient-to-r from-indigo-700  to-indigo-950">
          <div className="absolute top-4 right-4">
            <LanguageSwitcher className="bg-white text-indigo-900 hover:bg-white/90" />
          </div>
          <main
            id={MAIN_CONTENT_ID}
            className="flex flex-col justify-center space-y-6 w-full max-w-[480px]"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

AuthLayout.displayName = 'AuthLayout';
