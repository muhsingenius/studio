"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!currentUser) {
    // This will typically be very brief as the useEffect will redirect.
    // Or, if already on login page, this guard might not be used.
    return <LoadingSpinner fullPage />; 
  }

  return <>{children}</>;
}
