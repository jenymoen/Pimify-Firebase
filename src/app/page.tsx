
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { LogIn } from 'lucide-react'; 
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const router = useRouter();
  const { user, isInitialized, isLoading, initializeAuthListener } = useAuthStore();

  // Initialize auth listener if not already done (e.g. if user lands here first)
  useEffect(() => {
    if (!isInitialized) {
       const unsubscribe = initializeAuthListener();
       return () => unsubscribe();
    }
  }, [isInitialized, initializeAuthListener]);

  // Optional: Redirect to dashboard if already logged in
  useEffect(() => {
    if (isInitialized && user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isInitialized, isLoading, router]);

  if (isLoading || !isInitialized) {
     return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  }
  // If user is already logged in (and not loading), they'll be redirected by the useEffect above.
  // So, only render the landing page if they are not logged in or auth state is still loading.

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full px-6 py-4 flex justify-between items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span className="text-xl font-semibold text-primary">Pimify</span>
        </Link>
        <Link href="/auth/login" passHref>
          <Button size="md">
            <LogIn className="mr-2 h-4 w-4" /> Login
          </Button>
        </Link>
      </header>
      
      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-background to-muted/50 p-8 text-center">
        <div className="mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-24 w-24 text-primary mx-auto">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
        </div>
        <h1 className="text-5xl font-bold text-primary mb-4">
          Welcome to Pimify
        </h1>
        <p className="text-xl text-foreground/80 mb-8 max-w-2xl">
          Your intuitive Product Information Management (PIM) system designed to streamline your product data and enhance your workflow.
        </p>
        <Link href="/auth/login" passHref> 
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Go to Dashboard
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground mt-12">
          Manage product names, SKUs, descriptions, media, marketing info, and much more, all in one place.
        </p>
      </main>
    </div>
  );
}

