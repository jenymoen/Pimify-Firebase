"use client"
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/providers/query-provider';
import { FirebaseProvider } from '@/providers/firebase-provider';
import { AuthProvider } from '@/context/auth-context';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <FirebaseProvider>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </FirebaseProvider>
    </QueryProvider>
  );
}
