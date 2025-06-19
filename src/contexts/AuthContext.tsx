
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import type { User, Role } from "@/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation"; 

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        console.log(`AuthContext: Auth state changed. User UID: ${fbUser.uid}. Attempting to fetch profile.`);
        const userDocRef = doc(db, "users", fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setCurrentUser({ id: fbUser.uid, ...userDocSnap.data() } as User);
            console.log(`AuthContext: User profile for UID ${fbUser.uid} fetched successfully.`);
          } else {
            console.warn(`AuthContext: User profile for UID ${fbUser.uid} not found in Firestore. Creating new default profile.`);
            const newUserProfile: User = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName,
              role: "Staff", // Default role
            };
            await setDoc(userDocRef, newUserProfile);
            setCurrentUser(newUserProfile);
            console.log(`AuthContext: New default profile created for UID ${fbUser.uid}.`);
          }
        } catch (error: any) {
          console.error(`AuthContext: Error fetching user document for UID ${fbUser.uid}:`, error.message, error.code, error);
          // This is where the "client is offline" error might be caught.
          // Setting current user to null or a specific error state might be needed
          // depending on how you want the app to behave when profile fetch fails.
          setCurrentUser(null); 
        }
      } else {
        setCurrentUser(null);
        console.log("AuthContext: Auth state changed. No user (logged out or unauthenticated).");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    console.log("AuthContext: Attempting to logout.");
    try {
      await auth.signOut();
      setCurrentUser(null);
      setFirebaseUser(null);
      console.log("AuthContext: Logout successful. Redirecting to /login.");
      router.push("/login"); // Redirect to login after logout
    } catch (error: any) {
      console.error("AuthContext: Error logging out:", error.message, error.code, error);
      // Handle logout error (e.g., show a toast)
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    firebaseUser,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
