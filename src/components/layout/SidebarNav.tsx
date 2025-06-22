
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, FileText, CreditCard, Settings, BarChart3, Package, Briefcase, Landmark, ShoppingCart, Shapes, MonitorSmartphone, Wallet, FolderKanban, UsersRound, Calculator, UserCog, BookUser } from "lucide-react";
import type { Role } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: Role[]; // Roles that can see this item
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/customers", label: "Customers", icon: BookUser },
  { href: "/employees", label: "Employees", icon: UsersRound, roles: ["Admin", "Accountant"] },
  { href: "/items", label: "Items", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/sales", label: "Cash Sales", icon: ShoppingCart },
  { href: "/pos", label: "POS", icon: MonitorSmartphone, roles: ["Admin", "Sales"] },
  { href: "/payroll", label: "Payroll", icon: Wallet, roles: ["Admin", "Accountant"] },
  { href: "/revenue", label: "Revenue", icon: Landmark },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "Accountant"] },
  { href: "/settings/business", label: "Business Profile", icon: Briefcase },
  { href: "/settings/tax", label: "Tax Setup", icon: Settings, roles: ["Admin", "Accountant"] },
  { href: "/settings/payroll", label: "Payroll Settings", icon: Calculator, roles: ["Admin", "Accountant"] },
  { href: "/settings/categories", label: "Item Categories", icon: Shapes, roles: ["Admin", "Accountant"] },
  { href: "/settings/expense-categories", label: "Expense Categories", icon: FolderKanban, roles: ["Admin", "Accountant"] },
  { href: "/admin/users", label: "User Management", icon: UserCog, roles: ["Admin"] },
];

export default function SidebarNav({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  const userCanView = (item: NavItem) => {
    if (!currentUser) return false; 
    if (!item.roles || item.roles.length === 0) return true; 
    return item.roles.includes(currentUser.role);
  };

  const isActive = (itemHref: string) => {
    if (pathname === itemHref) {
      return true;
    }
    // Prevent /dashboard from matching child routes if any were ever added
    if (itemHref === "/dashboard") {
      return false;
    }
    // Match parent routes, e.g. /invoices for /invoices/new
    return pathname.startsWith(`${itemHref}/`);
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
            isActive(item.href)
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-foreground/80",
            collapsed ? "justify-center" : ""
          )}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          <item.icon className={cn("h-5 w-5", collapsed ? "" : "mr-3")} aria-hidden="true" />
          {!collapsed && <span>{item.label}</span>}
          {collapsed && <span className="sr-only">{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
