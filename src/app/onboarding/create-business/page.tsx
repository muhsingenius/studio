
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import CreateBusinessForm from "@/components/onboarding/CreateBusinessForm";
import AuthGuard from "@/components/auth/AuthGuard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function CreateBusinessPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && currentUser?.businessId) {
      // If user already has a businessId, redirect them to dashboard
      router.replace("/dashboard");
    }
  }, [currentUser, authLoading, router]);

  if (authLoading) {
    return <LoadingSpinner fullPage />;
  }

  // If user is loaded and already has a business, they'd be redirected.
  // If they don't have a businessId, show the form.
  // AuthGuard handles redirecting to login if not authenticated at all.
  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Briefcase className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="font-headline text-3xl">Set Up Your Business</CardTitle>
            <CardDescription>
              Welcome! Let&apos;s get your business information set up.
              You&apos;ll become the admin for this business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBusinessForm />
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
