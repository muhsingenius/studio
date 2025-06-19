"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import type { User, Role } from "@/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation"; // Corrected import

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
        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({ id: fbUser.uid, ...userDocSnap.data() } as User);
        } else {
          // New user, create a default profile (e.g., 'Staff' role)
          // This part might be handled more robustly during signup
          const newUserProfile: User = {
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName,
            role: "Staff", // Default role
          };
          await setDoc(userDocRef, newUserProfile);
          setCurrentUser(newUserProfile);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setCurrentUser(null);
      setFirebaseUser(null);
      router.push("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Error logging out:", error);
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
