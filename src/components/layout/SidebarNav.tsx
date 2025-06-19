
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, FileText, CreditCard, Settings, ShieldCheck, BarChart3, Package, Briefcase } from "lucide-react";
import type { Role } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: Role[]; // Roles that can see this item
  adminOnly?: boolean; // Simplified check if only Admin can see (alternative to roles)
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/items", label: "Items", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "Accountant"] },
  { 
    href: "/settings/business", 
    label: "Business Profile", 
    icon: Briefcase 
    // All authenticated users within a business should be able to see business profile settings.
    // Editing permissions will be handled on the page itself.
  },
  { href: "/settings/tax", label: "Tax Setup", icon: Settings, roles: ["Admin", "Accountant"] },
  { href: "/admin/users", label: "User Management", icon: ShieldCheck, roles: ["Admin"] },
];

export default function SidebarNav({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  const userCanView = (item: NavItem) => {
    if (!currentUser) return false; // Should not happen in AuthenticatedLayout
    if (item.adminOnly) return currentUser.role === "Admin";
    if (!item.roles || item.roles.length === 0) return true; // No specific roles defined, visible to all
    return item.roles.includes(currentUser.role);
  };

  return (
    <nav className="flex-grow px-2 space-y-1">
      {navItems.filter(item => userCanView(item)).map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "group flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            "hover:bg-primary-foreground hover:text-primary",
            pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && item.href !== "/settings/business" && !pathname.startsWith("/settings/tax") && !pathname.startsWith("/admin/users") ) || // for exact match
            (pathname.startsWith(item.href) && item.href === "/settings/business" && !pathname.startsWith("/settings/tax")) || // For /settings/business and not /settings/tax
            (pathname.startsWith(item.href) && item.href === "/settings/tax") || // For /settings/tax
            (pathname.startsWith(item.href) && item.href === "/admin/users") // For /admin/users
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-foreground/80",
            collapsed ? "justify-center" : ""
          )}
          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
        >
          <item.icon className={cn("h-5 w-5", collapsed ? "" : "mr-3")} aria-hidden="true" />
          {!collapsed && <span>{item.label}</span>}
          {collapsed && <span className="sr-only">{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
