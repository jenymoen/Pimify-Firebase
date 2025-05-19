
// src/app/(app)/profile/page.tsx
'use client';

import { useEffect, useState, type FormEvent, useRef, ChangeEvent } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Mail, Shield, Edit3, Save, XCircle, RefreshCw, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { updateProfile, updateEmail } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';


export default function ProfilePage() {
  const { user, isLoading: authLoading, setUser: setAuthStoreUser } = useAuthStore();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editableDisplayName, setEditableDisplayName] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Placeholder for image preview if we were handling local file selection
  // const [imagePreview, setImagePreview] = useState<string | null>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditableDisplayName(user.displayName || '');
      setEditableEmail(user.email || '');
      // setImagePreview(user.photoURL); // Set initial preview if photoURL exists
    }
  }, [user]);

  const getInitials = (email: string | null | undefined, displayName: string | null | undefined) => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length > 1) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  const handleEditToggle = () => {
    if (isEditing && user) {
      // Reset fields to current user state if canceling
      setEditableDisplayName(user.displayName || '');
      setEditableEmail(user.email || '');
      // setImagePreview(user.photoURL);
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  // Placeholder for file change handler - full implementation needs Firebase Storage
  // const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       setImagePreview(reader.result as string);
  //     };
  //     reader.readAsDataURL(file);
  //     // Here you would typically also prepare to upload the file
  //   }
  // };

  const handleSaveChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPageLoading(true);

    if (!auth || !auth.currentUser) {
      setError('User not authenticated or Firebase Auth not available.');
      setPageLoading(false);
      return;
    }

    const currentUser = auth.currentUser;
    let profileUpdated = false;
    let emailUpdated = false;
    // let photoUpdated = false; // For future photoURL update

    try {
      // Update Display Name
      if (editableDisplayName !== (currentUser.displayName || '')) {
        await updateProfile(currentUser, { displayName: editableDisplayName });
        profileUpdated = true;
      }

      // Update Email
      if (editableEmail !== currentUser.email) {
        await updateEmail(currentUser, editableEmail);
        emailUpdated = true;
      }
      
      // Placeholder: Actual photo upload and photoURL update would happen here
      // This would involve:
      // 1. Uploading the file from fileInputRef.current?.files?.[0] to Firebase Storage
      // 2. Getting the download URL of the uploaded image
      // 3. Calling await updateProfile(currentUser, { photoURL: downloadURL });
      // For now, we'll just simulate a photo update if the preview changed (which it won't yet)
      // if (imagePreview && imagePreview !== currentUser.photoURL) {
      //   console.log("Simulating photoURL update. Actual implementation needed.");
      //   // await updateProfile(currentUser, { photoURL: imagePreview }); // Example
      //   photoUpdated = true;
      // }

      if (profileUpdated || emailUpdated) { // || photoUpdated
        // Manually update the user object in the store after all successful updates
        // Firebase onAuthStateChanged might take time or not pick up all profile changes immediately
        const updatedUser = { ...auth.currentUser } as any; // Cast to any to allow dynamic assignment
        if (profileUpdated) updatedUser.displayName = editableDisplayName;
        if (emailUpdated) updatedUser.email = editableEmail;
        // if (photoUpdated && imagePreview) updatedUser.photoURL = imagePreview; // Example
        
        setAuthStoreUser(updatedUser);
        toast({ title: 'Profile Updated', description: 'Your profile details have been updated.' });
        setIsEditing(false);
      } else {
        toast({ title: 'No Changes', description: 'No changes were made to your profile.' });
        setIsEditing(false);
      }

    } catch (e: any) {
      console.error("Profile update error:", e);
      setError(e.message.replace('Firebase: ', ''));
      toast({ title: 'Update Failed', description: e.message.replace('Firebase: ', ''), variant: 'destructive' });
    } finally {
      setPageLoading(false);
    }
  };
  
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">User Profile</h1>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center relative">
            <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-7 w-48 mx-auto mb-2" />
            <Skeleton className="h-5 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3">
              <Skeleton className="h-6 w-6 rounded-full" /> <Skeleton className="h-5 w-3/4" />
            </div>
             <div className="flex items-center space-x-3 p-3">
              <Skeleton className="h-6 w-6 rounded-full" /> <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="flex items-center space-x-3 p-3">
              <Skeleton className="h-6 w-6 rounded-full" /> <Skeleton className="h-5 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user) { 
      return <div className="container mx-auto py-8 text-center"><p>User not found. Please log in.</p></div>
  }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">User Profile</h1>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center relative">
          <div className="relative mx-auto mb-4">
            <Avatar className="h-24 w-24 text-3xl">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User Avatar'} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email, user.displayName)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute bottom-0 right-[calc(50%-3rem)] transform translate-x-1/2 p-1 rounded-full bg-background border-2 border-primary hover:bg-primary/10"
                onClick={() => toast({ title: "Feature Coming Soon", description: "Profile picture upload will be implemented here."})}
                // onClick={() => fileInputRef.current?.click()} // For actual file input trigger
                title="Change Profile Picture (Coming Soon)"
              >
                <Camera className="h-4 w-4 text-primary" />
                <span className="sr-only">Change Profile Picture</span>
              </Button>
            )}
          </div>
          {/* Hidden file input for future use
          <Input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/gif" 
            onChange={handleFileChange} 
          />
          */}
          <CardTitle className="text-2xl">{user.displayName || user.email?.split('@')[0] || 'User'}</CardTitle>
          <CardDescription>Manage your profile information.</CardDescription>
          {!isEditing && (
            <Button variant="outline" size="icon" className="absolute top-4 right-4 rounded-full" onClick={handleEditToggle}>
              <Edit3 className="h-5 w-5" />
              <span className="sr-only">Edit Profile</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {isEditing ? (
            <form onSubmit={handleSaveChanges} className="space-y-6">
              <div>
                <Label htmlFor="displayName" className="font-medium text-foreground/80">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={editableDisplayName}
                  onChange={(e) => setEditableDisplayName(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="font-medium text-foreground/80">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={editableEmail}
                  onChange={(e) => setEditableEmail(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your email address"
                />
                 <p className="text-xs text-muted-foreground mt-1">Changing email may require verification and has security implications.</p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Update Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <CardFooter className="p-0 pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleEditToggle} disabled={pageLoading}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button type="submit" disabled={pageLoading}>
                  {pageLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          ) : (
            <>
              {user.displayName && (
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
                    <UserCircle className="h-5 w-5 text-primary" />
                    <div>
                    <p className="font-medium text-foreground/80">Display Name</p>
                    <p className="text-muted-foreground">{user.displayName}</p>
                    </div>
                </div>
              )}
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
                  <UserCircle className="h-5 w-5 text-primary" /> {/* Re-using icon, consider a specific one if available */}
                  <div>
                    <p className="font-medium text-foreground/80">Email Verified</p>
                    <p className="text-muted-foreground">{user.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
                <UserCircle className="h-5 w-5 text-primary" /> {/* Re-using icon */}
                <div>
                  <p className="font-medium text-foreground/80">Last Sign-in</p>
                  <p className="text-muted-foreground">{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
                <UserCircle className="h-5 w-5 text-primary" /> {/* Re-using icon */}
                <div>
                  <p className="font-medium text-foreground/80">Account Created</p>
                  <p className="text-muted-foreground">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

