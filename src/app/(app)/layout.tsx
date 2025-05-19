// src/app/(app)/layout.tsx
'use client';

import { AppShell } from '@/components/layout/app-shell';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isInitialized, initializeAuthListener } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [initializeAuthListener]);

  useEffect(() => {
    if (!isLoading && isInitialized && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, isInitialized, router]);

  if (isLoading || !isInitialized) {
    // More sophisticated loading screen can be built here
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 text-primary animate-pulse">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
           </svg>
          <p className="text-lg text-muted-foreground">Loading application...</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!user) {
    // This should ideally be caught by the useEffect redirect,
    // but as a fallback, show a message or redirect again.
    // Or simply return null to wait for redirect.
    return (
         <div className="flex h-screen w-screen items-center justify-center bg-background">
            <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
