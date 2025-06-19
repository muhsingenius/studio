// This file is deprecated and will be removed. Please use /app/items/page.tsx instead.
// Content is intentionally left minimal to indicate deprecation.

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import Link from "next/link";

export default function DeprecatedProductsPage() {
  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Products (Deprecated)"
          description="This page has been replaced by 'Items & Services'."
        />
        <p className="text-center text-muted-foreground">
          Please use the new <Link href="/items" className="text-primary underline">Items & Services</Link> page.
        </p>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
