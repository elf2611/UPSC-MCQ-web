"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  role?: string;
  negative_marking?: boolean;
  notifications_enabled?: boolean;
  autosave_enabled?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync with Supabase profiles table
  const syncProfile = async (firebaseUser: FirebaseUser, name?: string) => {
    try {
      // Check if profile exists
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", firebaseUser.uid)
        .single();

      if (error && error.code !== "PGRST116") { // not found
        console.error("Error fetching profile:", error);
      }

      if (!data) {
        // Create new profile
        const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const newProfile = {
          id: firebaseUser.uid,
          name: displayName,
          email: firebaseUser.email,
          plan: "free",
        };
        const { error: insertError } = await supabase.from("profiles").insert(newProfile);
        if (insertError) console.error("Error creating profile:", insertError);
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Profile sync error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signUpWithEmail = async (name: string, email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await syncProfile(userCredential.user, name);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
