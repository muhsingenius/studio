
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (!currentUser.businessId) {
          // If user is logged in but has no businessId, redirect to create business
          router.replace("/onboarding/create-business");
        } else {
          // If user has businessId, proceed to dashboard
          router.replace("/dashboard");
        }
      } else {
        // If no user, redirect to login
        router.replace("/login");
      }
    }
  }, [currentUser, loading, router]);

  return <LoadingSpinner fullPage />;
}
