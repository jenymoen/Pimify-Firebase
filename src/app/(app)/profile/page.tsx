
// src/app/(app)/profile/page.tsx
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">User Profile</h1>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-7 w-48 mx-auto mb-2" />
            <Skeleton className="h-5 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">User Profile</h1>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4 text-3xl">
            {/* Placeholder for user image if available */}
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User Avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.displayName || user.email?.split('@')[0] || 'User'}</CardTitle>
          <CardDescription>Manage your profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground/80">Email Address</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground/80">User ID</p>
              <p className="text-muted-foreground">{user.uid}</p>
            </div>
          </div>
           {user.emailVerified !== undefined && (
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground/80">Email Verified</p>
                <p className="text-muted-foreground">{user.emailVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
           <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground/80">Last Sign-in</p>
                <p className="text-muted-foreground">{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
             <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground/80">Account Created</p>
                <p className="text-muted-foreground">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          {/* Add more profile fields here as needed */}
        </CardContent>
      </Card>
    </div>
  );
}
