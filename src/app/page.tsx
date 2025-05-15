'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  // Option 1: Redirect immediately
  // useEffect(() => {
  //   router.replace('/products');
  // }, [router]);
  // return <div className="flex flex-1 items-center justify-center"><p>Loading Pimify...</p></div>;

  // Option 2: Show a welcome page
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-8 text-center">
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
      <Link href="/products" passHref>
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Go to Products
        </Button>
      </Link>
      <p className="text-sm text-muted-foreground mt-12">
        Manage product names, SKUs, descriptions, media, marketing info, and much more, all in one place.
      </p>
    </div>
  );
}
