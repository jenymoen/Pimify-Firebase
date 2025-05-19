// src/lib/auth-store.ts
'use client';

import { create } from 'zustand';
import { auth } from './firebase'; // Assuming auth is exported from firebase.ts
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean; // To track if onAuthStateChanged has run at least once
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  initializeAuthListener: () => () => void; // Returns the unsubscribe function
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true, // Start loading until first auth state check
  error: null,
  isInitialized: false,
  setUser: (user) => set({ user, isInitialized: true }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  logout: async () => {
    set({ isLoading: true });
    try {
      if (auth) {
        await signOut(auth);
        set({ user: null, error: null }); // Clear user on successful logout
      } else {
        throw new Error("Firebase Auth not initialized for logout.");
      }
    } catch (e: any) {
      console.error("Logout error:", e);
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },
  initializeAuthListener: () => {
    set({ isLoading: true });
    if (!auth) {
      console.warn("Firebase Auth not initialized. Auth listener not started.");
      set({ isLoading: false, isInitialized: true, user: null }); // Assume not logged in
      return () => {}; // Return a no-op unsubscribe function
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, isLoading: false, isInitialized: true });
    }, (error) => {
      console.error("Auth state listener error:", error);
      set({ user: null, isLoading: false, error: error.message, isInitialized: true });
    });
    return unsubscribe;
  },
}));

// Initialize the listener once when the store is first used/imported.
// This might run on server during build, but onAuthStateChanged is client-side.
// A better approach is to call initializeAuthListener from a root client component.
// For now, let's assume it will be called from _app.tsx or a similar root client component.
// Or, the (app)/layout.tsx can call it.
